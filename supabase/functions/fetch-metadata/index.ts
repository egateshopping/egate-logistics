import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Initialize Supabase client for weight rules lookup
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Find the best matching weight rule based on longest keyword match
// Returns both the weight and the matched keyword for debugging
async function findWeightForTitle(title: string): Promise<{ weight: number; keyword: string } | null> {
  if (!title) return null;
  
  const { data: rules, error } = await supabase
    .from('shipping_weight_rules')
    .select('keyword, weight')
    .order('keyword', { ascending: false }); // Will sort by keyword length in JS
  
  if (error || !rules || rules.length === 0) {
    console.log('No weight rules found or error:', error);
    return null;
  }
  
  const titleLower = title.toLowerCase();
  
  // Sort by keyword length (longest first) for priority matching
  const sortedRules = rules.sort((a, b) => b.keyword.length - a.keyword.length);
  
  for (const rule of sortedRules) {
    // Fuzzy matching: check if the title INCLUDES the keyword (case-insensitive)
    if (titleLower.includes(rule.keyword.toLowerCase())) {
      console.log(`Weight match: "${rule.keyword}" → ${rule.weight} lbs for "${title}"`);
      return { weight: rule.weight, keyword: rule.keyword };
    }
  }
  
  console.log(`No weight rule matched for title: "${title}"`);
  return null;
}

// Enhance image URLs for specific stores to get higher quality images
function enhanceImageUrl(imageUrl: string, pageUrl: string): string {
  try {
    const urlLower = pageUrl.toLowerCase();
    
    // ASOS: Change width parameter to 1080 for HD images
    if (urlLower.includes('asos.com')) {
      return imageUrl.replace(/wid=\d+/gi, 'wid=1080');
    }
    
    // Amazon: Remove size formatting codes to get full-size image
    // Pattern: ._AC_SX300_SY300_.jpg -> .jpg or ._AC_UL1500_.jpg -> .jpg
    if (urlLower.includes('amazon.')) {
      return imageUrl.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|gif|webp)/gi, '.$1');
    }
    
    // Nike: Try to get higher resolution by modifying size params
    if (urlLower.includes('nike.com')) {
      return imageUrl
        .replace(/wid=\d+/gi, 'wid=1200')
        .replace(/hei=\d+/gi, 'hei=1200');
    }
    
    // Zara: Increase image quality
    if (urlLower.includes('zara.com')) {
      return imageUrl.replace(/w=\d+/gi, 'w=1200');
    }
    
    // H&M: Increase quality
    if (urlLower.includes('hm.com')) {
      return imageUrl.replace(/width=\d+/gi, 'width=1200');
    }
    
    // Generic fallback - return as is
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use a more browser-like User-Agent to avoid blocks
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    let html = '';
    let fetchError = null;

    // Try fetching with a timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        fetchError = `HTTP ${response.status}`;
      } else {
        html = await response.text();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      fetchError = err instanceof Error ? err.message : 'Fetch failed';
      console.log('Primary fetch failed:', fetchError);
    }

    // If fetch failed, return gracefully (the UI will handle it)
    if (!html) {
      console.log('Could not fetch page:', fetchError);
      return new Response(
        JSON.stringify({ 
          image: null,
          title: null,
          success: false,
          error: 'Could not fetch page metadata'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);

    // Also try twitter:image as fallback
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i);

    let imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || null;

    // Enhance image URL based on store
    if (imageUrl) {
      imageUrl = enhanceImageUrl(imageUrl, url);
    }

    // Also try to get og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i);

    // Fallback to regular <title> tag
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const title = ogTitleMatch?.[1] || titleTagMatch?.[1]?.trim() || null;

    // Try to extract price from various sources
    let suggestedPrice: number | null = null;
    let category: string | null = null;

    // 1. Try og:price:amount
    const ogPriceMatch = html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:price:amount["'][^>]*>/i);
    
    if (ogPriceMatch?.[1]) {
      suggestedPrice = parseFloat(ogPriceMatch[1].replace(/[^0-9.]/g, ''));
    }

    // 2. Try product:price:amount
    if (!suggestedPrice) {
      const productPriceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:price:amount["'][^>]*>/i);
      
      if (productPriceMatch?.[1]) {
        suggestedPrice = parseFloat(productPriceMatch[1].replace(/[^0-9.]/g, ''));
      }
    }

    // 3. Try JSON-LD structured data
    if (!suggestedPrice) {
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match[1];
          const data = JSON.parse(jsonContent);
          
          // Handle array of objects
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            // Check for Product type
            if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
              // Extract price from offers
              if (item.offers) {
                const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (offers?.price) {
                  suggestedPrice = parseFloat(String(offers.price).replace(/[^0-9.]/g, ''));
                }
              }
              // Extract category
              if (item.category) {
                category = typeof item.category === 'string' ? item.category : item.category[0];
              }
              break;
            }
          }
        } catch {
          // JSON parse failed, continue to next match
        }
      }
    }

    // 4. Try og:product:category for category
    if (!category) {
      const categoryMatch = html.match(/<meta[^>]*property=["']product:category["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:category["'][^>]*>/i);
      category = categoryMatch?.[1] || null;
    }

    // Validate price is reasonable (not NaN and positive)
    if (suggestedPrice && (isNaN(suggestedPrice) || suggestedPrice <= 0 || suggestedPrice > 100000)) {
      suggestedPrice = null;
    }

    // 5. Look up estimated weight from shipping_weight_rules based on title
    // 5. Look up estimated weight from shipping_weight_rules based on title
    let suggestedWeight: number | null = null;
    let matchedKeyword: string | null = null;
    if (title) {
      const weightResult = await findWeightForTitle(title);
      if (weightResult) {
        suggestedWeight = weightResult.weight;
        matchedKeyword = weightResult.keyword;
      }
    }

    return new Response(
      JSON.stringify({ 
        image: imageUrl,
        title: title,
        suggested_price: suggestedPrice,
        suggested_weight: suggestedWeight,
        matched_keyword: matchedKeyword,
        category: category,
        success: !!(imageUrl || title || suggestedPrice || suggestedWeight)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ 
        image: null,
        title: null,
        success: false,
        error: 'Could not fetch metadata'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
