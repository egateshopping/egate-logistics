// 1. تأكد أن هذا السطر موجود في أعلى الملف (هذا ما يُحذف عادة بالخطأ)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // التعامل مع طلبات المتصفح (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    // 2. التحقق من وجود الرابط
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`🔍 Processing URL: ${url}`);

    // 3. الاتصال بالموقع مع "قناع" متصفح (User-Agent) ضروري جداً لـ eBay
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load page. Status: ${response.status}`);
    }

    const html = await response.text();

    // 4. تحليل الصفحة لاستخراج البيانات (هنا نستخدم المكتبة التي ربما حذفتها)
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      throw new Error("Failed to parse HTML");
    }

    // استراتيجية البحث عن الصور (نبدأ بالأقوى لـ eBay)
    const image =
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
      doc.querySelector("#icImg")?.getAttribute("src") || // خاص بـ eBay
      doc.querySelector(".image-gallery-image img")?.getAttribute("src") ||
      null;

    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      doc.querySelector("h1")?.textContent ||
      doc.querySelector("title")?.textContent ||
      "No Title";

    // إصلاح رابط الصورة إذا كان يبدأ بـ //
    let finalImage = image;
    if (finalImage && finalImage.startsWith("//")) {
      finalImage = "https:" + finalImage;
    }

    console.log(`✅ Extracted: ${title}`);

    return new Response(
      JSON.stringify({
        title: title ? title.trim() : "",
        image: finalImage,
        price: 0, // السعر صعب الاستخراج بدقة دائماً، نتركه 0
        url: url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
