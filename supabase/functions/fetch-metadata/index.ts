import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// دالة لتنظيف الاسم من الرابط (الخطة البديلة)
function extractInfoFromUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter((p) => p.length > 2);

    // استخراج الماركة
    let brand = urlObj.hostname.replace("www.", "").split(".")[0];
    if (brand === "usa" || brand === "shop") brand = urlObj.hostname.split(".")[1];
    brand = brand.charAt(0).toUpperCase() + brand.slice(1);

    // استخراج اسم المنتج من آخر جزء في الرابط
    let productTitle = pathSegments[pathSegments.length - 1] || "New Product";

    // تنظيف الاسم (إزالة الشرطات والأرقام الغريبة)
    productTitle = productTitle
      .replace(/-|_/g, " ") // استبدال الشرطات بمسافات
      .replace(".html", "")
      .replace(/\d{5,}.*/, "") // حذف الأرقام الطويلة في النهاية
      .trim();

    // جعل أول حرف كبيراً
    productTitle = productTitle.charAt(0).toUpperCase() + productTitle.slice(1);

    return { title: `${brand} - ${productTitle}`, description: `Imported from ${brand}` };
  } catch (e) {
    return { title: "New Order", description: "Manual Entry Required" };
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
    let description = "";

    // 1. المحاولة عبر Jina AI (قد تنجح وقد تفشل)
    try {
      const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (jinaResponse.ok) {
        const text = await jinaResponse.text();

        // محاولة صيد العنوان
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        if (titleMatch) title = titleMatch[1];

        // محاولة صيد السعر
        const priceMatch = text.match(/(\$|USD|€|£)\s?([0-9,]+(\.[0-9]{2})?)/i);
        if (priceMatch) price = priceMatch[2].replace(/,/g, "");

        // محاولة صيد الصورة
        const imgMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (imgMatch) image = imgMatch[1];
      }
    } catch (e) {
      console.log("Jina failed, moving to fallback.");
    }

    // 2. إذا فشلنا في جلب البيانات (أو كان السعر فارغاً)، نستخدم المعلومات من الرابط
    if (!title || title === "Title" || title.includes("Access Denied")) {
      const fallbackInfo = extractInfoFromUrl(url);
      title = fallbackInfo.title;
      description = fallbackInfo.description;
      console.log("⚠️ Used URL fallback for title.");
    }

    // تنظيف العنوان النهائي
    title = title.replace("Access Denied", "").replace("403 Forbidden", "").trim();
    if (title.length < 3) {
      const info = extractInfoFromUrl(url);
      title = info.title;
    }

    return new Response(
      JSON.stringify({
        title: title, // سيعود باسم المنتج المستخرج من الرابط
        description: description || "Auto-detected from link",
        image: image, // قد تكون فارغة (وهذا طبيعي للمواقع المحجوبة)
        price: price, // قد تكون 0 (عليك إدخالها يدوياً)
        url: url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    // في حال حدوث خطأ كارثي، نعيد المعلومات من الرابط فقط
    const info = extractInfoFromUrl(req.url || "");
    return new Response(
      JSON.stringify({
        title: info.title,
        description: "Manual Entry Needed",
        image: "",
        price: "0",
        url: req.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
