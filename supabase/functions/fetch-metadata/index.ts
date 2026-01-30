import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. دالة بحث محسنة جداً (تستخدم واجهة DuckDuckGo JSON لضمان عدم الحظر) 🦆
async function searchImageBySKU(query: string): Promise<{ image: string; title: string }> {
  try {
    console.log(`🎯 SKU Hunter: Searching for '${query}'`);
    // نستخدم DuckDuckGo API لأنه لا يحظر السيرفرات ويعطي JSON مباشر
    const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const data = await res.json();

    if (data && data.results && data.results.length > 0) {
      // نأخذ أول صورة لأن البحث بالكود دقيق جداً
      return { image: data.results[0].image, title: data.results[0].title };
    }
    return { image: "", title: "" };
  } catch (e) {
    console.error("Search Failed:", e);
    return { image: "", title: "" };
  }
}

// 2. استخراج الكود (SKU) والماركة بذكاء 🧠
function analyzeUrl(url: string): { brand: string; sku: string; keywords: string } {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const parts = path.split("/").filter((p) => p.length > 1);
    const lastPart = parts[parts.length - 1];

    // استخراج الماركة
    let brand = urlObj.hostname.replace("www.", "").split(".")[0];
    if (brand === "usa" || brand === "shop" || brand === "store") brand = urlObj.hostname.split(".")[1];

    // 🏹 استخراج الـ SKU (كلمة السر)
    let sku = "";

    // نمط أديداس وتومي (أحرف وأرقام في نهاية الرابط)
    // مثال: JS0433.html أو XW05867-1A4
    const skuMatch = lastPart.match(/([A-Z0-9]{5,})/);
    if (skuMatch) {
      sku = skuMatch[1];
    } else {
      // محاولة إيجاد أي رقم مميز في الرابط
      const potentialSku = parts.find((p) => p.match(/^[A-Z0-9]+$/) && p.length > 4);
      if (potentialSku) sku = potentialSku;
    }

    // استخراج كلمات وصفية (للعنوان)
    const keywords = parts
      .filter((p) => !p.match(/html|php|en|us|product|category/i)) // حذف الكلمات العامة
      .slice(-2) // نأخذ آخر كلمتين
      .join(" ")
      .replace(/-/g, " ")
      .replace(sku, ""); // نحذف الكود من الاسم

    return { brand, sku, keywords };
  } catch (e) {
    return { brand: "", sku: "", keywords: "" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Processing:", url);

    // تحليل الرابط
    const { brand, sku, keywords } = analyzeUrl(url);
    console.log(`📊 Analysis -> Brand: ${brand}, SKU: ${sku}`);

    let title = "";
    let image = "";
    let price = "0";

    // A. المحاولة الأولى: JSON-LD (البيانات الهيكلية) 🏗️
    // معظم المواقع الكبيرة تضع بيانات خفية لجوجل، سنحاول قراءتها
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      });

      if (response.ok) {
        const html = await response.text();

        // البحث عن JSON-LD
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            // قد يكون مصفوفة أو كائن
            const product = Array.isArray(data) ? data.find((i) => i["@type"] === "Product") : data;

            if (product) {
              if (product.image) image = Array.isArray(product.image) ? product.image[0] : product.image;
              if (product.name) title = product.name;
              if (product.offers && product.offers.price) price = product.offers.price;
              console.log("✅ Data found via JSON-LD!");
            }
          } catch (e) {
            console.log("JSON-LD parse error");
          }
        }

        // إذا لم نجد في JSON، نبحث في Meta Tags العادية
        if (!image) {
          const doc = new DOMParser().parseFromString(html, "text/html");
          image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
          title = title || doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
        }
      }
    } catch (err) {
      console.log("❌ Direct fetch failed.");
    }

    // B. المحاولة الثانية (الأقوى): البحث بالكود (SKU Strategy) 🏹
    // إذا لم نجد صورة، أو كانت الصورة "وهمية"، نستخدم استراتيجية الكود
    if (!image || image.length < 10 || image.includes("placeholder")) {
      let searchQuery = "";

      if (sku && sku.length > 3) {
        // 🌟 الخلطة السرية: اسم الماركة + الكود
        searchQuery = `${brand} ${sku}`;
      } else {
        // إذا لم نجد كود، نستخدم الاسم المستخرج
        searchQuery = `${brand} ${keywords}`;
      }

      const fallbackData = await searchImageBySKU(searchQuery);

      if (fallbackData.image) {
        image = fallbackData.image;
        console.log(`✅ Image found via SKU Search: ${searchQuery}`);
      }

      if (!title || title.trim() === "") {
        title = keywords ? brand + " " + keywords : brand + " Product " + sku;
      }
    }

    // تنظيف العنوان
    title = title.replace(/\b(usa|en|shop|store)\b/gi, "").trim();
    // جعل أول حرف كبيراً
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return new Response(
      JSON.stringify({
        title: title || "New Order",
        description: `Imported from ${brand}`,
        image: image,
        price: price,
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
