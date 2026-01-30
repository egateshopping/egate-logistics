import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة البحث في صور جوجل (تم تحسين Regex لقبول جميع الصيغ) 🕵️‍♂️
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

    // 🔥 التحديث هنا: قبول روابط جوجل المشفرة (tbn)
    // نبحث عن أول صورة تابعة لجوجل (thumbnails)
    const googleImgMatch = html.match(/src="(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^"]+)"/);

    if (googleImgMatch) {
      return { image: googleImgMatch[1], title: query };
    }

    // محاولة احتياطية: أي رابط صورة آخر
    const anyImgMatch = html.match(/src="(https?:\/\/[^"]+\.(jpg|png|jpeg|webp))"/);
    if (anyImgMatch) {
      return { image: anyImgMatch[1], title: query };
    }

    return { image: "", title: "" };
  } catch (e) {
    console.error("Google Fallback Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. استخراج الكلمات المفتاحية واسم الماركة بذكاء 🧠
function extractKeywords(url: string): string {
  try {
    const urlObj = new URL(url);

    // استخراج اسم الماركة الصحيح (التعامل مع usa.tommy.com)
    const hostnameParts = urlObj.hostname.split(".");
    let brand = hostnameParts[0];
    // إذا كان النطاق فرعي مثل usa.tommy أو www.amazon، نأخذ الجزء الثاني
    if (hostnameParts.length > 2 && (brand === "www" || brand === "usa" || brand === "shop" || brand.length < 3)) {
      brand = hostnameParts[1];
    }

    const pathSegments = urlObj.pathname.split("/").filter((s) => s.length > 2);

    // تنظيف الرابط من الكلمات غير المهمة
    const interestingParts = pathSegments.filter(
      (s) => !s.match(/^(en|us|product|shop|category|clothing|women|men)$/i),
    );

    let productKeywords = "";
    if (interestingParts.length > 0) {
      // نأخذ آخر جزء مع قبل الأخير لضمان الدقة
      const rawKeywords = interestingParts.slice(-2).join(" ");
      productKeywords = rawKeywords
        .replace(/[-_]/g, " ") // حذف الشرطات
        .replace(".html", "") // حذف الامتداد
        .replace(/\d{5,}/g, "") // حذف الأرقام الطويلة (أكواد المنتجات)
        .trim();
    }

    // النتيجة: اسم الماركة + اسم المنتج
    return `${brand} ${productKeywords}`.trim();
  } catch (e) {
    return "Product Image";
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

    // A. المحاولة الأولى: الدخول المباشر
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || doc.title || "";
        image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

        const priceMeta =
          doc.querySelector('meta[property="product:price:amount"]') ||
          doc.querySelector('meta[property="og:price:amount"]');
        if (priceMeta) price = priceMeta.getAttribute("content") || "0";

        // Jomashop Fix
        if (url.includes("jomashop") && (!price || price === "0")) {
          const bodyText = doc.body?.textContent || "";
          const match = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
          if (match) price = match[1];
        }
      } else {
        console.log("⚠️ Access blocked. Switching to Google Fallback.");
        fetchFailed = true;
      }
    } catch (err) {
      fetchFailed = true;
    }

    // B. المحاولة الثانية: Google Fallback (المحدثة) 🌟
    // تعمل الآن مع روابط الصور المشفرة ومع الماركات الفرعية
    if (fetchFailed || !image || image.length < 5 || image.includes("placeholder")) {
      const keywords = extractKeywords(url);

      // البحث باستخدام الكلمات المستخرجة بدقة
      const googleData = await searchGoogleImages(keywords);

      if (googleData.image) {
        image = googleData.image;
      }

      // إذا كان العنوان فارغاً أو غير واضح، نستخدم الكلمات المستخرجة
      if (!title || title.trim() === "" || title.includes("Access Denied")) {
        title = keywords.charAt(0).toUpperCase() + keywords.slice(1);
      }
    }

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
