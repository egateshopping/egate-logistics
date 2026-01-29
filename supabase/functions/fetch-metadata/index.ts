import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Images fallback search (free, no API key needed)
async function fetchFallbackImage(query: string): Promise<string> {
  try {
    console.log(`🔎 Searching Google Images for: ${query}`);
    const res = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    
    const html = await res.text();
    
    // Extract image URLs from Google's response
    const imageMatch = html.match(/src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))"/i) || 
                       html.match(/src="(https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"]+)"/);

    if (imageMatch && imageMatch[1]) {
      console.log("✅ Found fallback image from Google!");
      return imageMatch[1];
    }
    return "";
  } catch (e) {
    console.error("Fallback image search failed:", e);
    return "";
  }
}

// Extract keywords from URL path
function extractFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathSegments = url.pathname.split('/').filter(s => s.length > 0);
    let slug = "";
    
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      if ((lastSegment.includes('.html') || lastSegment.match(/^[A-Z0-9]+$/)) && pathSegments.length > 1) {
        slug = pathSegments[pathSegments.length - 2];
      } else {
        slug = lastSegment.replace('.html', '');
      }
    }
    return slug.replace(/-/g, ' ');
  } catch {
    return "";
  }
}

// Enhance image quality for known retailers
function enhanceImageUrl(imageUrl: string, sourceUrl: string): string {
  if (!imageUrl) return "";
  
  try {
    // Nike: Get larger image
    if (sourceUrl.includes('nike.com') && imageUrl.includes('nike.com')) {
      return imageUrl.replace(/\?.*$/, '') + '?fmt=png-alpha&wid=800';
    }
    // Adidas: Get larger image
    if (sourceUrl.includes('adidas.') && imageUrl.includes('adidas.')) {
      return imageUrl.replace(/w_\d+/, 'w_800').replace(/h_\d+/, 'h_800');
    }
    // Amazon: Get larger image
    if (sourceUrl.includes('amazon.') && imageUrl.includes('amazon.')) {
      return imageUrl.replace(/\._.*_\./, '._SL1200_.');
    }
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

// Try multiple fetch strategies
async function fetchWithStrategies(url: string): Promise<Response | null> {
  const strategies: Record<string, string>[] = [
    // Strategy 1: Chrome Desktop
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Referer": "https://www.google.com/",
    },
    // Strategy 2: iPhone Safari (mobile sites often less protected)
    {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    // Strategy 3: Googlebot
    {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`📡 Trying strategy ${i + 1}...`);
      const response = await fetch(url, { 
        headers: strategies[i],
        redirect: 'follow',
      });
      
      if (response.ok) {
        console.log(`✅ Strategy ${i + 1} succeeded`);
        return response;
      }
      console.log(`❌ Strategy ${i + 1} failed: ${response.status}`);
    } catch (e) {
      console.log(`❌ Strategy ${i + 1} error:`, e);
    }
  }
  return null;
}

// Match weight rules from database
async function matchWeightRule(text: string): Promise<{ weight: number; length: number | null; width: number | null; height: number | null } | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: rules } = await supabase
      .from('shipping_weight_rules')
      .select('keyword, weight, default_length, default_width, default_height');
    
    if (!rules) return null;
    
    const lowerText = text.toLowerCase();
    for (const rule of rules) {
      if (lowerText.includes(rule.keyword.toLowerCase())) {
        console.log(`🎯 Matched weight rule: "${rule.keyword}" = ${rule.weight} lbs`);
        return {
          weight: rule.weight,
          length: rule.default_length,
          width: rule.default_width,
          height: rule.default_height,
        };
      }
    }
  } catch (e) {
    console.log("Weight rule matching error:", e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log("🚀 Fetching metadata for:", url);

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Extract keywords from URL first
    const urlKeywords = extractFromUrl(url);
    console.log("🔗 URL Keywords:", urlKeywords);

    // 2. Try fetching with multiple strategies
    const response = await fetchWithStrategies(url);

    // If all strategies failed, return URL-based fallback
    if (!response) {
      console.warn("⚠️ All fetch strategies failed, using URL fallback");
      
      // Still try to match weight from URL keywords
      const weightMatch = await matchWeightRule(urlKeywords);
      
      return new Response(
        JSON.stringify({
          title: urlKeywords || "Product",
          description: urlKeywords,
          image: "",
          price: "0",
          suggested_weight: weightMatch?.weight || null,
          default_length: weightMatch?.length || null,
          default_width: weightMatch?.width || null,
          default_height: weightMatch?.height || null,
          url: url,
          success: false,
          fetch_failed: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse HTML', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let title = "";
    let description = "";
    let image = "";
    let price = "";
    let category = "";

    // Strategy 1: JSON-LD (Gold standard)
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json = JSON.parse(script.textContent || "");
        const dataArray = Array.isArray(json) ? json : [json];

        let items: any[] = [];
        for (const item of dataArray) {
          if (item['@graph'] && Array.isArray(item['@graph'])) {
            items = items.concat(item['@graph']);
          } else {
            items.push(item);
          }
        }

        for (const item of items) {
          const itemType = item["@type"];
          const isProduct = itemType === "Product" || (Array.isArray(itemType) && itemType.includes("Product"));

          if (isProduct) {
            title = item.name || title;
            image = (Array.isArray(item.image) ? item.image[0] : item.image) || image;
            description = item.description || description;
            category = item.category || item.brand?.name || category;

            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              price = String(offer.price || offer.lowPrice || price);
            }
          }

          if (item["@type"] === "BreadcrumbList" && item.itemListElement) {
            const parts = item.itemListElement.map((el: any) => el.name || el.item?.name).filter(Boolean);
            if (parts.length > 0) category = parts.join(" • ");
          }
        }
      } catch (e) {
        console.log("JSON-LD parse error:", e);
      }
    }

    // Strategy 2: Meta Tags & Open Graph
    if (!title) {
      title = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        doc.querySelector('title')?.textContent || "";
    }
    if (!image) {
      image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || "";
    }
    if (!description) {
      description = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    }
    if (!price) {
      price = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
        doc.querySelector('meta[property="og:price:amount"]')?.getAttribute("content") || "";
    }

    // Adidas-specific selectors
    if (!price) {
      const priceEl = doc.querySelector('.gl-price-item') || doc.querySelector('[data-auto-id="product-price"]');
      if (priceEl) price = priceEl.textContent || "";
    }

    // Fallback price search
    if (!price) {
      const bodyText = doc.body?.textContent || "";
      const priceMatch = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
      if (priceMatch) price = priceMatch[1].replace(/,/g, '');
    }

    // Clean and enhance
    title = title.split('|')[0].split(' - ')[0].trim();
    image = enhanceImageUrl(image, url);
    
    const cleanPrice = price ? price.replace(/[^0-9.]/g, '') : "0";
    let suggestedPrice: number | null = null;
    if (cleanPrice) {
      const parsed = parseFloat(cleanPrice);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        suggestedPrice = parsed;
      }
    }

    // Merge all text for weight matching
    const richDescription = `${title} ${description} ${category} ${urlKeywords}`.trim();
    const displayTitle = title || urlKeywords || "Product";

    // 🔥 Google Images fallback if no image found
    if (!image || image.length < 10) {
      console.log("⚠️ No image found in source. Triggering Google Fallback...");
      const searchQuery = `${displayTitle} ${urlKeywords}`.trim();
      const fallbackImage = await fetchFallbackImage(searchQuery);
      if (fallbackImage) {
        image = fallbackImage;
      }
    }

    // Match weight rule
    const weightMatch = await matchWeightRule(richDescription);

    console.log(`✅ Success: ${displayTitle} | Image: ${image ? 'Yes' : 'No'} | Price: $${cleanPrice} | Weight: ${weightMatch?.weight || 'N/A'}`);

    return new Response(
      JSON.stringify({
        title: displayTitle,
        description: richDescription,
        image: image,
        price: cleanPrice,
        suggested_price: suggestedPrice,
        suggested_weight: weightMatch?.weight || null,
        default_length: weightMatch?.length || null,
        default_width: weightMatch?.width || null,
        default_height: weightMatch?.height || null,
        category: category,
        url: url,
        success: !!(image || displayTitle || suggestedPrice),
        fetch_failed: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: 'Could not fetch metadata', success: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
