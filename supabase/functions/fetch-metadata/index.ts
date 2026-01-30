import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة البحث في Bing (المنقذ الجديد) 🟢
// Bing يسمح للسيرفرات بالبحث أكثر من جوجل
async function searchBingImages(query: string): Promise<{ image: string; title: string }> {
  try {
    console.log(`🔎 Bing Search for: ${query}`);
    // نستخدم رابط Bing للصور
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&tsc=ImageHoverTitle`;

    const res = await fetch(searchUrl, {
      headers: {
        // رأس متصفح حقيقي جداً
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edge/120.0.0.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const html = await res.text();

    // Bing يخفي روابط الصور داخل كود JSON يسمى murl
    // هذا التعبير النمطي يستخرج أول رابط صورة نظيف
    const match = html.match(/murl&quot;:&quot;(https?:\/\/.*?)&quot;/);

    if (match && match[1]) {
      return { image: match[1], title: query };
    }

    // محاولة بديلة: البحث عن أول وسم صورة
    const imgMatch = html.match(/<img[^>]+src="(https?:\/\/[^"]+(jpg|png|jpeg))"/i);
    if (imgMatch) {
      return { image: imgMatch[1], title: query };
    }

    return { image: "", title: "" };
  } catch (e) {
    console.error("Bing Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. تحليل الرابط لاستخراج الكود والماركة
function analyzeUrl(url: string): { brand: string; query: string } {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const parts = path.split("/").filter((p) => p.length > 1);

    // استخراج الماركة
    let brand = urlObj.hostname.replace("www.", "").split(".")[0];
    if (brand === "usa" || brand === "shop" || brand.length < 3) brand = urlObj.hostname.split(".")[1];

    // محاولة استخراج الكود (SKU)
    const lastPart = parts[parts.length - 1];
    const skuMatch = lastPart.match(/([A-Z0-9]{5,})/);
    const sku = skuMatch ? skuMatch[1] : "";

    // تنظيف الكلمات المفتاحية من الرابط
    const keywords = parts
      .filter((p) => !p.match(/html|php|en|us|product|category|shop/i))
      .slice(-2) // آخر كلمتين
      .join(" ")
      .replace(/-/g, " ")
      .replace(sku, "");

    // تكوين جملة البحث المثالية
    // إذا وجدنا الكود، نبحث به لأنه أدق
    let query = "";
    if (sku && sku.length > 4) {
      query = `${brand} ${sku}`;
    } else {
      query = `${brand} ${keywords}`;
    }

    return { brand, query: query.trim() };
  } catch (e) {
    return { brand: "Product", query: "Product" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Processing:", url);

    const { brand, query } = analyzeUrl(url);
    console.log(`🎯 Strategy: Search Bing for '${query}'`);

    let title = "";
    let image = "";
    let price = "0";

    // 1. محاولة الدخول المباشر (للمواقع السهلة فقط)
    // نتجاوزها للمواقع الصعبة (تومي/أديداس) لتوفير الوقت وتجنب الحظر
    const isHardSite = url.includes("tommy") || url.includes("adidas") || url.includes("nike");

    if (!isHardSite) {
      try {
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (response.ok) {
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
          title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
        }
      } catch (e) {}
    }

    // 2. البحث في Bing (الحل الأساسي للمواقع الصعبة) 🟢
    if (!image || image.length < 5 || image.includes("placeholder")) {
      const bingData = await searchBingImages(query);
      if (bingData.image) {
        image = bingData.image;
        console.log("✅ Image found via Bing!");
      }

      // تحسين العنوان
      if (!title || title.trim() === "") {
        // جعل أول حرف كبيراً
        title = query.replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }

    // وضع صورة افتراضية أنيقة إذا فشل كل شيء
    if (!image) {
      image = "https://placehold.co/600x600/png?text=No+Image+Found";
    }

    return new Response(
      JSON.stringify({
        title: title || "New Product",
        description: `Imported from ${brand}`,
        image: image,
        price: price, // السعر صعب استخراجه من البحث، نتركه 0 ليعدله الأدمن
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
