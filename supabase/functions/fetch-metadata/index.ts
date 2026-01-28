const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    return new Response(
      JSON.stringify({ 
        image: imageUrl,
        title: title,
        success: !!(imageUrl || title)
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
