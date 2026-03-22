import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_WEIGHTS: Record<string, { weight: number; l: number; w: number; h: number }> = {
  shoes: { weight: 2.5, l: 13, w: 8, h: 6 },
  clothing: { weight: 1.0, l: 12, w: 10, h: 3 },
  electronics: { weight: 3.0, l: 14, w: 10, h: 6 },
  supplements: { weight: 2.0, l: 8, w: 8, h: 8 },
  beauty: { weight: 1.0, l: 8, w: 6, h: 4 },
  bags: { weight: 2.0, l: 14, w: 10, h: 5 },
  jewelry: { weight: 0.5, l: 6, w: 4, h: 2 },
  sports: { weight: 3.0, l: 14, w: 10, h: 6 },
  home: { weight: 4.0, l: 16, w: 12, h: 8 },
  watches: { weight: 1.0, l: 8, w: 6, h: 4 },
  sunglasses: { weight: 0.5, l: 7, w: 5, h: 3 },
  accessories: { weight: 0.5, l: 8, w: 6, h: 3 },
  cosmetics: { weight: 1.0, l: 8, w: 6, h: 4 },
  fragrance: { weight: 1.5, l: 8, w: 6, h: 4 },
  baby_clothing: { weight: 0.5, l: 10, w: 8, h: 3 },
  car_parts: { weight: 5.0, l: 16, w: 12, h: 8 },
  other: { weight: 2.0, l: 12, w: 10, h: 6 },
};

function detectCategoryFromUrl(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("apple.com") || u.includes("bestbuy.com") || u.includes("newegg.com") ||
      u.includes("bhphotovideo.com") || u.includes("store.google.com")) return "electronics";
  if (u.includes("nike.com") || u.includes("adidas.com") || u.includes("puma.com") ||
      u.includes("reebok.com") || u.includes("underarmour.com") || u.includes("skechers.com")) return "sports";
  if (u.includes("sephora.com") || u.includes("hudabeauty.com") || u.includes("maccosmetics.com") ||
      u.includes("nyxcosmetics.com") || u.includes("morphe.com")) return "cosmetics";
  if (u.includes("fragrancenet.com")) return "fragrance";
  if (u.includes("bodybuilding.com") || u.includes("muscleandstrength.com") || u.includes("iherb.com")) return "supplements";
  if (u.includes("jomashop.com")) return "watches";
  if (u.includes("ray-ban.com")) return "sunglasses";
  if (u.includes("swarovski.com")) return "jewelry";
  if (u.includes("aldoshoes.com") || u.includes("6pm.com") || u.includes("zappos.com") ||
      u.includes("charleskeith.com")) return "shoes";
  if (u.includes("carters.com") || u.includes("gerberchildrenswear.com") || u.includes("oshkosh.com")) return "baby_clothing";
  if (u.includes("quirkparts.com") || u.includes("gmpartsdirect.com") || u.includes("parts.toyota.com") ||
      u.includes("toyotapartsdeal.com") || u.includes("knfilters.com") || u.includes("ngksparkplugs.com")) return "car_parts";
  if (u.includes("zara.com") || u.includes("mango.com") || u.includes("asos.com") ||
      u.includes("hm.com") || u.includes("gap.com") || u.includes("levi.com") ||
      u.includes("victoriassecret.com") || u.includes("abercrombie.com") ||
      u.includes("nordstrom.com") || u.includes("macys.com") || u.includes("lacoste.com") ||
      u.includes("ralphlauren.com") || u.includes("hugoboss.com") || u.includes("tommy.com") ||
      u.includes("calvinklein.us") || u.includes("uspoloassn.com")) return "clothing";
  return null;
}

function detectCategoryFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.match(/shoe|boot|sneaker|sandal|heel/)) return "shoes";
  if (t.match(/shirt|pants|dress|jacket|coat|jeans|cloth|hoodie|sweater/)) return "clothing";
  if (t.match(/phone|laptop|tablet|camera|tv|monitor|electronic|iphone|ipad|macbook/)) return "electronics";
  if (t.match(/vitamin|supplement|protein|whey|creatine|capsule|powder|nutrition|muscle/)) return "supplements";
  if (t.match(/makeup|cream|serum|perfume|beauty|skin|lipstick|foundation/)) return "cosmetics";
  if (t.match(/fragrance|cologne|parfum|eau de/)) return "fragrance";
  if (t.match(/bag|purse|wallet|backpack|handbag/)) return "bags";
  if (t.match(/watch|timepiece|rolex|omega/)) return "watches";
  if (t.match(/sunglasses|eyewear|glasses/)) return "sunglasses";
  if (t.match(/ring|necklace|bracelet|earring|jewelry|crystal/)) return "jewelry";
  if (t.match(/sport|gym|fitness|yoga|running|workout/)) return "sports";
  if (t.match(/home|kitchen|furniture|decor/)) return "home";
  if (t.match(/baby|infant|toddler|kids|children/)) return "baby_clothing";
  if (t.match(/car|auto|vehicle|spare|parts|filter|spark plug/)) return "car_parts";
  return "other";
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

function isAmazon(url: string): boolean { return url.includes("amazon.com"); }
function isEbay(url: string): boolean { return url.includes("ebay.com"); }

function parsePrice(raw: any): number | null {
  if (!raw) return null;
  const str = String(raw).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseWeight(text: string): number | null {
  const patterns = [
    /(\d+\.?\d*)\s*(pounds?|lbs?|lb)/i,
    /(\d+\.?\d*)\s*kg/i,
    /(\d+\.?\d*)\s*oz(?!\w)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      if (unit.startsWith("kg")) return parseFloat((val * 2.205).toFixed(2));
      if (unit.startsWith("oz")) return parseFloat((val / 16).toFixed(2));
      return val;
    }
  }
  return null;
}

function parseDimensions(text: string): { l: number; w: number; h: number } | null {
  const m = text.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(inches?|cm)?/i);
  if (!m) return null;
  let l = parseFloat(m[1]), w = parseFloat(m[2]), h = parseFloat(m[3]);
  if (m[4]?.toLowerCase().startsWith("cm")) { l /= 2.54; w /= 2.54; h /= 2.54; }
  return { l: parseFloat(l.toFixed(1)), w: parseFloat(w.toFixed(1)), h: parseFloat(h.toFixed(1)) };
}

async function fetchAmazonData(url: string, productName: string, apiKey: string) {
  const asin = extractAsin(url);
  if (!asin) throw new Error("Could not extract ASIN from URL");
  const weightFromName = parseWeight(productName || "");
  const categoryFromUrl = detectCategoryFromUrl(url);
  const apiUrl = `https://api.scrapingdog.com/amazon/product?api_key=${apiKey}&domain=com&asin=${asin}&country=us`;
  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  console.log("Scrapingdog status:", res.status);
  const raw = await res.text();
  console.log("Response preview:", raw.substring(0, 500));
  const productData = JSON.parse(raw);
  const title = productData?.title || productName || "";
  const category = categoryFromUrl || detectCategoryFromText(title + " " + (productName || ""));
  const defaults = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS["other"];
  const price = parsePrice(productData?.price) || parsePrice(productData?.final_price) || null;
  const details = productData?.product_details || {};
  const allText = JSON.stringify(details) + " " + title + " " + (productName || "");
  let weight = weightFromName || parseWeight(allText);
  const dims = parseDimensions(allText);
  if (!weight) weight = defaults.weight;
  const finalDims = dims || { l: defaults.l, w: defaults.w, h: defaults.h };
  return {
    weightLbs: parseFloat(weight.toFixed(2)),
    lengthInch: finalDims.l, widthInch: finalDims.w, heightInch: finalDims.h,
    category, price,
    confidence: weight !== defaults.weight ? "high" : "low",
    productName: title || productName || "Unknown",
  };
}

async function fetchEbayData(url: string, productName: string) {
  const microlinkRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true`);
  const microlinkData = await microlinkRes.json();
  const title = microlinkData?.data?.title || productName || "";
  const description = microlinkData?.data?.description || "";
  const fullText = `${title} ${description} ${productName || ""}`;
  let price: number | null = null;
  const priceMatch = fullText.match(/\$\s*(\d+\.?\d*)/);
  if (priceMatch) price = parseFloat(priceMatch[1]);
  const category = detectCategoryFromText(fullText);
  const defaults = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS["other"];
  let weight = parseWeight(fullText);
  const dims = parseDimensions(fullText);
  if (!weight) weight = defaults.weight;
  const finalDims = dims || { l: defaults.l, w: defaults.w, h: defaults.h };
  return {
    weightLbs: parseFloat(weight.toFixed(2)),
    lengthInch: finalDims.l, widthInch: finalDims.w, heightInch: finalDims.h,
    category, price,
    confidence: weight !== defaults.weight ? "high" : "low",
    productName: title || productName || "Unknown",
  };
}

async function fetchGenericData(url: string, productName: string) {
  const categoryFromUrl = detectCategoryFromUrl(url);
  const microlinkRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true`);
  const microlinkData = await microlinkRes.json();
  const title = microlinkData?.data?.title || productName || "";
  const description = microlinkData?.data?.description || "";
  const fullText = `${title} ${description} ${productName || ""}`;
  let price: number | null = null;
  const priceMatch = fullText.match(/\$\s*(\d+\.?\d*)/);
  if (priceMatch) price = parseFloat(priceMatch[1]);
  const category = categoryFromUrl || detectCategoryFromText(fullText);
  const defaults = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS["other"];
  let weight = parseWeight(fullText);
  const dims = parseDimensions(fullText);
  if (!weight) weight = defaults.weight;
  const finalDims = dims || { l: defaults.l, w: defaults.w, h: defaults.h };
  return {
    weightLbs: parseFloat(weight.toFixed(2)),
    lengthInch: finalDims.l, widthInch: finalDims.w, heightInch: finalDims.h,
    category, price,
    confidence: weight !== defaults.weight ? "high" : "low",
    productName: title || productName || "Unknown",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { url, productName } = await req.json();
    const apiKey = Deno.env.get("SCRAPINGDOG_API_KEY") || "";
    let result;
    if (isAmazon(url)) {
      console.log("Processing Amazon");
      result = await fetchAmazonData(url, productName, apiKey);
    } else if (isEbay(url)) {
      console.log("Processing eBay");
      result = await fetchEbayData(url, productName);
    } else {
      console.log("Processing generic:", url);
      result = await fetchGenericData(url, productName);
    }
    console.log("Result:", JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", String(err));
    const defaults = CATEGORY_WEIGHTS["other"];
    return new Response(
      JSON.stringify({
        weightLbs: defaults.weight, lengthInch: defaults.l,
        widthInch: defaults.w, heightInch: defaults.h,
        category: "other", price: null, confidence: "low",
        error: String(err),
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
