import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة البحث في صور جوجل (المنقذ عند فشل أمازون) 🕵️‍♂️
async function searchGoogleImages(query: string): Promise<{ image: string; title: string }> {
  try {
    console.log(`🔎 Google Fallback Searching for: ${query}`);
    // نستخدم واجهة جوجل القديمة لأنها أسرع وأسهل في القراءة
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&gbv=1`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = await res.text();

    // استخراج أول صورة حقيقية
    const imgMatch = html.match(/src="(https?:\/\/[^"]+\.(jpg|png|jpeg|webp))"/);
    const image = imgMatch ? imgMatch[1] : "";

    // محاولة تخمين العنوان من نتائج البحث (اختياري)
    return { image, title: query };
  } catch (e) {
    console.error("Google Fallback Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. استخراج الكلمات المهمة من الرابط
function extractKeywords(url: string): string {
  try {
    const urlObj = new URL(url);

    // أ. إذا كان أمازون، نبحث عن كود ASIN (مثل B08...)
    if (url.includes("amazon")) {
      const asinMatch = url.match(/\/(B[0-9A-Z]{9})/);
      if (asinMatch) return `Amazon product ${asinMatch[1]}`;

      // محاولة استخراج الاسم من الرابط
      const pathParts = urlObj.pathname.split("/");
      const likelyName = pathParts.find((p) => p.length > 10 && !p.startsWith("B0"));
      if (likelyName) return likelyName.replace(/-/g, " ");
    }

    // ب. باقي المواقع
    const pathSegments = urlObj.pathname.split("/").filter((s) => s.length > 2);
    return pathSegments[pathSegments.length - 1].replace(/[-_]/g, " ").replace(".html", "");
  } catch (e) {
    return "Product";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Fetching:", url);

    let title = "";
    let image = "";
    let price = "0";
    let description = "";

    // 🛑 التحقق الخاص بأمازون (تخطي الفحص المباشر لأنه سيفشل غالباً)
    const isAmazon = url.includes("amazon") || url.includes("amzn");

    if (isAmazon) {
      console.log("⚠️ Amazon link detected! Switching to Google Fallback immediately.");
      const keywords = extractKeywords(url);
      const googleResult = await searchGoogleImages(keywords);

      image = googleResult.image;
      title = googleResult.title; // سنستخدم الكلمات المستخرجة كعنوان مؤقت

      // محاولة البحث عن السعر في جوجل أيضاً (صعبة قليلاً لكن سنحاول)
      // عادة نتركه 0 ليقوم المستخدم بإدخاله يدوياً في أمازون
      price = "0";
    } else {
      // ✅ المواقع العادية (Jomashop, eBay, etc.)
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept-Language": "en-US",
          },
        });

        if (response.ok) {
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, "text/html");

          // استخراج البيانات بالطرق القياسية
          title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || doc.title || "";
          image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

          // محاولة صيد السعر
          const priceMeta =
            doc.querySelector('meta[property="product:price:amount"]') ||
            doc.querySelector('meta[property="og:price:amount"]');
          if (priceMeta) price = priceMeta.getAttribute("content") || "0";

          // Jomashop Fix
          if (!price || price === "0") {
            const bodyText = doc.body?.textContent || "";
            const match = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
            if (match) price = match[1];
          }
        }
      } catch (err) {
        console.log("Direct fetch failed, using fallback...");
      }
    }

    // 🔥 خط الدفاع الأخير: إذا فشلنا في جلب الصورة (سواء أمازون أو غيره)
    if (!image || image.length < 5) {
      const keywords = extractKeywords(url);
      const googleData = await searchGoogleImages(keywords);
      if (googleData.image) image = googleData.image;
      if (!title || title.trim() === "") title = googleData.title;
    }

    // تنظيف البيانات
    const cleanPrice = price ? price.replace(/[^0-9.]/g, "") : "0";

    return new Response(
      JSON.stringify({
        title: title || "New Product",
        description: description || "Product from Amazon/Web",
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
