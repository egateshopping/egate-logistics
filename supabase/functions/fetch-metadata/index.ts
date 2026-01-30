import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Requesting via Microlink for:", url);

    // 1. استخدام خدمة Microlink المجانية
    // هذه الخدمة تتكفل بتجاوز الحجب وجلب البيانات الجاهزة
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=true`;

    const response = await fetch(microlinkUrl);
    const data = await response.json();

    console.log("📡 Microlink Response Status:", data.status);

    let title = "";
    let image = "";
    let description = "";

    // 2. استخراج البيانات من رد Microlink
    if (data.status === "success" && data.data) {
      const meta = data.data;

      // جلب العنوان
      title = meta.title || meta.description || "New Product";

      // جلب الصورة (نبحث عن أفضل جودة)
      if (meta.image && meta.image.url) {
        image = meta.image.url;
      } else if (meta.logo && meta.logo.url) {
        image = meta.logo.url; // صورة الشعار كبديل
      } else if (meta.screenshot && meta.screenshot.url) {
        image = meta.screenshot.url; // لقطة شاشة كاملة كحل أخير
      }

      description = meta.description || "";
    }

    // 3. (اختياري) تنظيف السعر من الوصف إذا وجد
    // Microlink أحياناً يضع السعر في الوصف
    let price = "0";
    if (description) {
      const priceMatch = description.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
      if (priceMatch) price = priceMatch[1].replace(/,/g, "");
    }

    // 4. خطة الطوارئ الأخيرة: إذا فشل Microlink أيضاً
    // نضع صورة "قيد الانتظار" بدلاً من تركها فارغة
    if (!image) {
      console.log("⚠️ No image found via Microlink.");
      // صورة رمادية أنيقة كبديل مؤقت
      image = "https://placehold.co/600x400/e2e8f0/475569?text=Product+Image";
    }

    return new Response(
      JSON.stringify({
        title: title,
        description: description,
        image: image,
        price: price,
        url: url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
