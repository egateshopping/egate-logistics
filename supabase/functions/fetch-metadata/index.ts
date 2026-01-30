import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة البحث في صور جوجل (المنقذ لجميع المواقع الصعبة) 🕵️‍♂️
async function searchGoogleImages(query: string): Promise<{ image: string; title: string }> {
  try {
    console.log(`🔎 Fallback: Searching Google Images for: ${query}`);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&gbv=1`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = await res.text();

    // استخراج أول صورة حقيقية من نتائج جوجل
    const imgMatch = html.match(/src="(https?:\/\/[^"]+\.(jpg|png|jpeg|webp))"/);
    const image = imgMatch ? imgMatch[1] : "";

    return { image, title: query };
  } catch (e) {
    console.error("Google Fallback Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. استخراج الكلمات المفتاحية من الرابط بذكاء 🧠
function extractKeywords(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter((s) => s.length > 2);

    // استراتيجية تومي وأديداس: عادة الاسم يكون في آخر الرابط
    // مثال: /high-rise-wide-leg-jean/XW05867
    // نأخذ الأجزاء المهمة وننظفها
    const interestingParts = pathSegments.filter((s) => !s.match(/^(en|us|product|shop)$/i));

    if (interestingParts.length > 0) {
      // نأخذ آخر جزأين لزيادة الدقة
      const keywords = interestingParts.slice(-2).join(" ");
      return keywords.replace(/[-_]/g, " ").replace(".html", "").replace(/\d+$/, ""); // تنظيف الأرقام الزائدة
    }

    return "Product Image";
  } catch (e) {
    return "Product";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Processing URL:", url);

    let title = "";
    let image = "";
    let price = "0";
    let fetchFailed = false;

    // A. المحاولة الأولى: الدخول المباشر (Direct Fetch) 🚪
    // نحاول الدخول "بالحسنى" للمواقع التي تسمح بذلك (مثل Jomashop)
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        // محاولة سحب البيانات الرسمية
        title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || doc.title || "";
        image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

        // سحب السعر (للمواقع المتعاونة)
        const priceMeta =
          doc.querySelector('meta[property="product:price:amount"]') ||
          doc.querySelector('meta[property="og:price:amount"]');
        if (priceMeta) price = priceMeta.getAttribute("content") || "0";

        // إصلاح Jomashop الخاص
        if (url.includes("jomashop") && (!price || price === "0")) {
          const bodyText = doc.body?.textContent || "";
          const match = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
          if (match) price = match[1];
        }
      } else {
        console.log(`⚠️ Site blocked access (Status: ${response.status}). Switching to Plan B...`);
        fetchFailed = true;
      }
    } catch (err) {
      console.log("❌ Direct fetch error. Switching to Plan B...");
      fetchFailed = true;
    }

    // B. المحاولة الثانية: خطة الإنقاذ الشاملة (Universal Fallback) 🪂
    // تعمل إذا فشل الاتصال (تومي/أديداس/أمازون) أو إذا نجح الاتصال لكن لم نجد صورة
    if (fetchFailed || !image || image.length < 5) {
      const keywords = extractKeywords(url);
      // إضافة اسم الموقع للبحث لزيادة الدقة
      const domain = new URL(url).hostname.replace("www.", "").split(".")[0];
      const searchQuery = `${domain} ${keywords}`.trim();

      const googleData = await searchGoogleImages(searchQuery);

      if (googleData.image) {
        image = googleData.image;
        console.log("✅ Image rescued via Google!");
      }

      // إذا لم نجد عنواناً من الموقع، نستخدم كلمات البحث كعنوان مؤقت
      if (!title || title.trim() === "") {
        title = keywords.charAt(0).toUpperCase() + keywords.slice(1);
      }
    }

    // تنظيف السعر
    const cleanPrice = price ? price.replace(/[^0-9.]/g, "") : "0";

    return new Response(
      JSON.stringify({
        title: title || "New Product",
        description: "Fetched via Egate Smart System",
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
