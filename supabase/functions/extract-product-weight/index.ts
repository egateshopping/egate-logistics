import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Regex-based weight extraction from product name ──
function extractWeightFromName(name: string): number | null {
  if (!name) return null;
  // Match patterns like "20 lbs", "5.5 pounds", "10lb", "2.0 lb"
  const match = name.match(/(\d+\.?\d*)\s*(pounds?|lbs?|lb)\b/i);
  if (match) {
    const lbs = parseFloat(match[1]);
    if (lbs > 0 && lbs < 500) return lbs;
  }
  // Also try kg and convert
  const kgMatch = name.match(/(\d+\.?\d*)\s*(kg|kilograms?)\b/i);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (kg > 0 && kg < 250) return parseFloat((kg * 2.20462).toFixed(2));
  }
  // Try ounces
  const ozMatch = name.match(/(\d+\.?\d*)\s*(oz|ounces?)\b/i);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1]);
    if (oz > 0 && oz < 5000) return parseFloat((oz / 16).toFixed(2));
  }
  return null;
}

// ── Extract price from text ──
function extractPrice(text: string): number | null {
  const match = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return null;
}

// ── Extract dimensions from text (L x W x H) ──
function extractDimensions(text: string): {
  lengthInch: number;
  widthInch: number;
  heightInch: number;
} | null {
  // Match patterns like "12 x 10 x 6 inches" or "12x10x6 in"
  const match = text.match(
    /(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(inches|inch|in|")/i
  );
  if (match) {
    return {
      lengthInch: parseFloat(match[1]),
      widthInch: parseFloat(match[2]),
      heightInch: parseFloat(match[3]),
    };
  }
  return null;
}

// ── Categorize product ──
function categorizeProduct(name: string): string {
  const lower = name.toLowerCase();
  if (/phone|iphone|samsung|pixel|galaxy/.test(lower)) return "electronics";
  if (/laptop|macbook|notebook|chromebook/.test(lower)) return "electronics";
  if (/shirt|dress|pants|jeans|jacket|hoodie|sweater/.test(lower)) return "clothing";
  if (/shoe|sneaker|boot|sandal|nike|adidas/.test(lower)) return "shoes";
  if (/vitamin|supplement|protein|whey|creatine/.test(lower)) return "supplements";
  if (/toy|lego|game|puzzle/.test(lower)) return "toys";
  if (/book|textbook|novel/.test(lower)) return "books";
  if (/cream|serum|lotion|perfume|cologne|makeup/.test(lower)) return "beauty";
  return "other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, productName } = await req.json();
    console.log("📦 extract-product-weight called:", { url, productName });

    let weightLbs: number | null = null;
    let price: number | null = null;
    let lengthInch = 0;
    let widthInch = 0;
    let heightInch = 0;
    let category = categorizeProduct(productName || "");

    // ── Step 1: Try regex extraction from product name ──
    weightLbs = extractWeightFromName(productName || "");
    if (weightLbs) {
      console.log(`✅ Weight extracted from product name: ${weightLbs} lbs`);
    }

    // ── Step 2: Scrape product page via Jina AI for more details ──
    let jinaText = "";
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const res = await fetch(jinaUrl, {
        headers: { "X-No-Cache": "true" },
        signal: AbortSignal.timeout(15000),
      });
      jinaText = await res.text();
      console.log(`✅ Jina returned ${jinaText.length} chars`);
    } catch (e) {
      console.warn("⚠️ Jina fetch failed:", e);
    }

    // ── Step 3: Extract price from page if available ──
    if (jinaText) {
      const pagePrice = extractPrice(jinaText);
      if (pagePrice && pagePrice > 0) {
        price = pagePrice;
        console.log(`✅ Price from page: $${price}`);
      }
    }

    // ── Step 4: If no weight from name, try to find it in page text ──
    if (!weightLbs && jinaText) {
      // Look for "Item Weight" or "Shipping Weight" patterns (common on Amazon)
      // Handle no-space cases like "Item Weight20 Pounds"
      const weightPatterns = [
        /(?:Item|Product|Shipping|Package)\s*Weight[:\s\u200e\u200f]*(\d+\.?\d*)\s*(pounds?|lbs?|lb)\b/i,
        /(?:Item|Product|Shipping|Package)\s*Weight[:\s\u200e\u200f]*(\d+\.?\d*)\s*(ounces?|oz)\b/i,
        /(?:Item|Product|Shipping|Package)\s*Weight[:\s\u200e\u200f]*(\d+\.?\d*)\s*(kg|kilograms?)\b/i,
        /(?:Weight)[:\s\u200e\u200f]*(\d+\.?\d*)\s*(pounds?|lbs?|lb)\b/i,
        /(\d+\.?\d*)\s*(pounds?|lbs?|lb)\b/i,
      ];
      for (const pattern of weightPatterns) {
        const match = jinaText.match(pattern);
        if (match) {
          const w = parseFloat(match[1]);
          const unit = match[2].toLowerCase();
          if (w > 0 && w < 5000) {
            if (unit.startsWith("oz") || unit.startsWith("ounce")) {
              weightLbs = parseFloat((w / 16).toFixed(2));
            } else if (unit === "kg" || unit.startsWith("kilogram")) {
              weightLbs = parseFloat((w * 2.20462).toFixed(2));
            } else {
              weightLbs = w;
            }
            console.log(`✅ Weight from page scrape: ${weightLbs} lbs (raw: ${w} ${unit})`);
            break;
          }
        }
      }
      }

      // Extract dimensions from page
      const dims = extractDimensions(jinaText);
      if (dims) {
        lengthInch = dims.lengthInch;
        widthInch = dims.widthInch;
        heightInch = dims.heightInch;
        console.log(`✅ Dimensions: ${lengthInch} x ${widthInch} x ${heightInch} in`);
      }
    }

    // ── Step 5: Use AI as last resort for weight extraction ──
    if (!weightLbs && jinaText.length > 100) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const aiRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content:
                      'Extract product weight in lbs, price in USD, and dimensions in inches from this product page text. Return ONLY valid JSON: {"weightLbs":number,"price":number,"lengthInch":number,"widthInch":number,"heightInch":number}. If a value is unknown, use 0.',
                  },
                  {
                    role: "user",
                    content: jinaText.substring(0, 4000),
                  },
                ],
                temperature: 0,
              }),
            }
          );
          const aiJson = await aiRes.json();
          const content = aiJson.choices?.[0]?.message?.content || "";
          // Extract JSON from response
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (!weightLbs && parsed.weightLbs > 0) {
              weightLbs = parsed.weightLbs;
              console.log(`✅ Weight from AI: ${weightLbs} lbs`);
            }
            if (!price && parsed.price > 0) {
              price = parsed.price;
            }
            if (!lengthInch && parsed.lengthInch > 0) {
              lengthInch = parsed.lengthInch;
              widthInch = parsed.widthInch || 0;
              heightInch = parsed.heightInch || 0;
            }
          }
        }
      } catch (e) {
        console.warn("⚠️ AI extraction failed:", e);
      }
    }

    const result = {
      weightLbs: weightLbs || 0,
      price: price || 0,
      lengthInch,
      widthInch,
      heightInch,
      category,
      productName: productName || "",
    };

    console.log("📦 Final result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ extract-product-weight error:", err);
    return new Response(
      JSON.stringify({ error: err.message, weightLbs: 0, price: 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
