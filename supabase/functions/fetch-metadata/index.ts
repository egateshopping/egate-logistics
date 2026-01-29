import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Initialize Supabase client for weight rules lookup
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Find the best matching weight rule based on longest keyword match
async function findWeightForTitle(title: string): Promise<{ weight: number; keyword: string; dims: { l: number; w: number; h: number } } | null> {
  if (!title) return null;
  
  const { data: rules, error } = await supabase
    .from('shipping_weight_rules')
    .select('keyword, weight, default_length, default_width, default_height');
  
  if (error || !rules || rules.length === 0) {
    console.log('No weight rules found or error:', error);
    return null;
  }
  
  const titleLower = title.toLowerCase();
  
  // Sort by keyword length (longest first) for priority matching
  const sortedRules = rules.sort((a, b) => b.keyword.length - a.keyword.length);
  
  for (const rule of sortedRules) {
    if (titleLower.includes(rule.keyword.toLowerCase())) {
      console.log(`Weight match: "${rule.keyword}" → ${rule.weight} lbs for "${title}"`);
      return { 
        weight: rule.weight, 
        keyword: rule.keyword,
        dims: {
          l: rule.default_length || 0,
          w: rule.default_width || 0,
          h: rule.default_height || 0
        }
      };
    }
  }
  
  console.log(`No weight rule matched for title: "${title}"`);
  return null;
}

// Enhance image URLs for specific stores
function enhanceImageUrl(imageUrl: string, pageUrl: string): string {
  try {
    const urlLower = pageUrl.toLowerCase();
    
    if (urlLower.includes('asos.com')) {
      return imageUrl.replace(/wid=\d+/gi, 'wid=1080');
    }
    
    if (urlLower.includes('amazon.')) {
      return imageUrl.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|gif|webp)/gi, '.$1');
    }
    
    if (urlLower.includes('nike.com')) {
      return imageUrl.replace(/wid=\d+/gi, 'wid=1200').replace(/hei=\d+/gi, 'hei=1200');
    }
    
    if (urlLower.includes('zara.com')) {
      return imageUrl.replace(/w=\d+/gi, 'w=1200');
    }
    
    if (urlLower.includes('hm.com')) {
      return imageUrl.replace(/width=\d+/gi, 'width=1200');
    }
    
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log("Fetching metadata for:", url);

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch with browser-like headers
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    if (!response.ok) {
      console.log(`Failed to fetch: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Could not fetch page', success: false }),
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
    let currency = "";

    // ---------------------------------------------------------
    // Strategy 1: JSON-LD (Gold standard for Nike, Adidas, etc.)
    // ---------------------------------------------------------
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json = JSON.parse(script.textContent || "");
        const dataArray = Array.isArray(json) ? json : [json];
        
        // Handle @graph structure
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
          const isProduct = itemType === "Product" || 
                           (Array.isArray(itemType) && itemType.includes("Product"));
          
          if (isProduct) {
            title = item.name || title;
            image = (Array.isArray(item.image) ? item.image[0] : item.image) || image;
            description = item.description || description;
            category = item.category || item.brand?.name || category;

            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              price = String(offer.price || offer.lowPrice || price);
              currency = offer.priceCurrency || currency;
            }
          }

          // Extract breadcrumb for category
          if (item["@type"] === "BreadcrumbList" && item.itemListElement) {
            const parts = item.itemListElement
              .map((el: any) => el.name || el.item?.name)
              .filter(Boolean);
            if (parts.length > 0) {
              category = parts.slice(-2).join(" • ");
            }
          }
        }
      } catch (e) {
        console.log("JSON-LD parse error:", e);
      }
    }

    // ---------------------------------------------------------
    // Strategy 2: Meta Tags & Open Graph
    // ---------------------------------------------------------
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

    if (!currency) {
      currency = doc.querySelector('meta[property="product:price:currency"]')?.getAttribute("content") ||
                 doc.querySelector('meta[property="og:price:currency"]')?.getAttribute("content") || "";
    }

    // ---------------------------------------------------------
    // Strategy 3: Fallback text search for price
    // ---------------------------------------------------------
    if (!price) {
      const bodyText = doc.body?.textContent || "";
      const priceMatch = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
      if (priceMatch) {
        price = priceMatch[1].replace(/,/g, '');
      }
    }

    // ---------------------------------------------------------
    // Cleaning & Processing
    // ---------------------------------------------------------
    
    // Clean title (remove site name suffixes)
    const originalTitle = title;
    title = title.split('|')[0].split(' - ')[0].trim();
    
    // Combine title with category for richer description
    let combinedTitle = title;
    if (category && !title.toLowerCase().includes(category.toLowerCase())) {
      combinedTitle = `${title} • ${category}`;
    }

    // Enhance image URL based on store
    if (image) {
      image = enhanceImageUrl(image, url);
    }

    // Parse price as number
    let suggestedPrice: number | null = null;
    if (price) {
      const parsed = parseFloat(String(price).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        suggestedPrice = parsed;
      }
    }

    // ---------------------------------------------------------
    // Weight & Dimensions Lookup
    // ---------------------------------------------------------
    let suggestedWeight: number | null = null;
    let matchedKeyword: string | null = null;
    let defaultDims = { l: 0, w: 0, h: 0 };
    
    // Use combined title + description for matching
    const searchText = `${originalTitle} ${description} ${category}`;
    const weightResult = await findWeightForTitle(searchText);
    
    if (weightResult) {
      suggestedWeight = weightResult.weight;
      matchedKeyword = weightResult.keyword;
      defaultDims = weightResult.dims;
    }

    console.log("Extracted:", { title, image: image?.substring(0, 50), price: suggestedPrice, weight: suggestedWeight });

    return new Response(
      JSON.stringify({ 
        title: combinedTitle,
        image,
        suggested_price: suggestedPrice,
        suggested_weight: suggestedWeight,
        matched_keyword: matchedKeyword,
        default_length: defaultDims.l || null,
        default_width: defaultDims.w || null,
        default_height: defaultDims.h || null,
        category,
        currency,
        success: !!(image || title || suggestedPrice || suggestedWeight)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Could not fetch metadata', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
