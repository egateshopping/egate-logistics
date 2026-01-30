import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة البحث في DuckDuckGo (أكثر استقراراً من جوجل للسيرفرات) 🦆
async function searchDuckDuckGo(query: string): Promise<{ image: string; title: string }> {
  try {
    console.log(`🦆 DuckDuckGo Search for: ${query}`);

    // نطلب البيانات بصيغة JSON مباشرة من واجهة DDG
    const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const data = await res.json();

    // التحقق من وجود نتائج
    if (data && data.results && data.results.length > 0) {
      // نأخذ أول نتيجة
      const firstResult = data.results[0];
      return {
        image: firstResult.image,
        title: firstResult.title,
      };
    }

    return { image: "", title: "" };
  } catch (e) {
    console.error("DuckDuckGo Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. استخراج الكلمات المفتاحية بذكاء 🧠
function extractKeywords(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter((s) => s.length > 2);

    // تنظيف الرابط
    const interestingParts = pathSegments.filter(
      (s) => !s.match(/^(en|us|product|shop|category|clothing|women|men|html)$/i),
    );

    // اسم الماركة
    let brand = urlObj.hostname.replace("www.", "").split(".")[0];
    if (brand === "usa" || brand === "shop") brand = urlObj.hostname.split(".")[1];

    if (interestingParts.length > 0) {
      // نأخذ آخر جزء حقيقي في الرابط لأنه عادة يحتوي اسم المنتج
      const rawName = interestingParts[interestingParts.length - 1];

      // تنظيف الاسم من الأكواد والشرطات
      const cleanName = rawName
        .replace(/[-_]/g, " ")
        .replace(".html", "")
        .replace(/[A-Z0-9]{5,}/g, "") // إزالة الأكواد الطويلة مثل XW05867
        .trim();

      return `${brand} ${cleanName}`;
    }
    return `${brand} product`;
  } catch (e) {
    return "Product";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Processing:", url);

    let title = "";
    let image = "";
    let price = "0";

    // A. المحاولة الأولى: انتحال شخصية "Facebook Bot" 🎭
    // المواقع عادة تسمح لفيسبوك بالدخول لجلب الصور للمشاركة
    try {
      const response = await fetch(url, {
        headers: {
          // هذا هو السطر السحري! نقول للموقع نحن بوت فيسبوك
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        // Open Graph هو المعيار الذي تستخدمه المواقع لفيسبوك
        image =
          doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
          doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
          "";

        title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || doc.title || "";

        // محاولة سحب السعر (قد لا تنجح دائماً مع البوت)
        const priceMeta =
          doc.querySelector('meta[property="product:price:amount"]') ||
          doc.querySelector('meta[property="og:price:amount"]');
        if (priceMeta) price = priceMeta.getAttribute("content") || "0";

        if (!image) console.log("⚠️ Site loaded but no OG image found.");
      } else {
        console.log("⚠️ Site blocked Facebook Bot too.");
      }
    } catch (err) {
      console.log("❌ Direct fetch failed.");
    }

    // B. المحاولة الثانية: DuckDuckGo Rescue 🦆
    // إذا فشلنا في جلب الصورة أو كانت الصورة "وهمية"
    if (!image || image.length < 10 || image.includes("placeholder")) {
      const keywords = extractKeywords(url);
      console.log(`🔄 Switching to DuckDuckGo for: ${keywords}`);

      const ddgData = await searchDuckDuckGo(keywords);

      if (ddgData.image) {
        image = ddgData.image;
        console.log("✅ Image found via DuckDuckGo!");
      }

      if (!title || title.trim() === "") {
        title = keywords.charAt(0).toUpperCase() + keywords.slice(1);
      }
    }

    const cleanPrice = price ? price.replace(/[^0-9.]/g, "") : "0";

    return new Response(
      JSON.stringify({
        title: title || "Unknown Product",
        description: "Fetched via Smart Proxy",
        image: image,
        price: cleanPrice,
        url: url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
