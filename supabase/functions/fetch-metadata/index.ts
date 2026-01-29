import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ------------------------------------------------------------------
// 🛠️ Helper: Extract keywords from URL path
// ------------------------------------------------------------------
function extractFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathSegments = url.pathname.split('/').filter(s => s.length > 0);
    
    let slug = "";
    
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // If last segment is a product code (e.g., KI6678.html), take the previous one
      if ((lastSegment.includes('.html') || lastSegment.match(/^[A-Z0-9]+$/)) && pathSegments.length > 1) {
        slug = pathSegments[pathSegments.length - 2];
      } else {
        slug = lastSegment.replace('.html', '');
      }
    }

    // Clean: replace dashes with spaces
    return slug.replace(/-/g, ' ');
  } catch {
    return "";
  }
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

    // 1. Parse URL first (first line of defense)
    const urlKeywords = extractFromUrl(url);
    console.log("🔗 URL Keywords:", urlKeywords);

    // 2. Anti-blocking strategy with multiple user agents
    const userAgents = {
      browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      googleBot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    };

    let response = await fetch(url, {
      headers: {
        "User-Agent": userAgents.browser,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    // 3. If blocked (403/401), retry as Googlebot
    if (response.status === 403 || response.status === 401) {
      console.log("⚠️ Blocked as Browser. Retrying as Googlebot... 🤖");
      response = await fetch(url, { headers: { "User-Agent": userAgents.googleBot } });
    }

    // If fetch completely failed, use URL fallback
    if (!response.ok) {
      console.warn(`Failed to fetch content, using URL fallback.`);
      return new Response(
        JSON.stringify({
          title: urlKeywords || "Product Item",
          description: `Extracted from URL: ${urlKeywords}`,
          image: "",
          price: "0",
          url: url,
          success: true
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

    // Core variables
    let title = "";
    let description = "";
    let image = "";
    let price = "";
    let category = "";

    // ---------------------------------------------------------
    // Strategy 1: JSON-LD (Gold standard for Nike, Adidas)
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
            }
          }

          // Extract breadcrumb for category
          if (item["@type"] === "BreadcrumbList" && item.itemListElement) {
            const parts = item.itemListElement
              .map((el: any) => el.name || el.item?.name)
              .filter(Boolean);
            if (parts.length > 0) {
              category = parts.join(" • ");
            }
          }
        }
      } catch (e) {
        console.log("JSON-LD parse error:", e);
      }
    }

    // ---------------------------------------------------------
    // Strategy 2: Meta Tags & Open Graph (fallback)
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

    // Adidas-specific price selectors
    if (!price) {
      const priceEl = doc.querySelector('.gl-price-item') || doc.querySelector('[data-auto-id="product-price"]');
      if (priceEl) price = priceEl.textContent || "";
    }

    // ---------------------------------------------------------
    // Strategy 3: Fallback text search for price ($)
    // ---------------------------------------------------------
    if (!price) {
      const bodyText = doc.body?.textContent || "";
      const priceMatch = bodyText.match(/\$\s?([0-9,]+(\.[0-9]{2})?)/);
      if (priceMatch) {
        price = priceMatch[1].replace(/,/g, '');
      }
    }

    // ---------------------------------------------------------
    // Cleaning & Merging (The Magic Mix) 🧪
    // ---------------------------------------------------------

    // Clean title (remove site name suffixes)
    title = title.split('|')[0].split(' - ')[0].trim();

    // Clean price
    const cleanPrice = price ? price.replace(/[^0-9.]/g, '') : "0";
    let suggestedPrice: number | null = null;
    if (cleanPrice) {
      const parsed = parseFloat(cleanPrice);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        suggestedPrice = parsed;
      }
    }

    // ✅ Merge all info into rich description for weight keyword matching
    // Order: Official description + Category tree + URL keywords
    const richDescription = `${description} ${category} ${urlKeywords}`.trim();

    // Use URL keywords as title fallback
    const displayTitle = title || urlKeywords || "New Product";

    console.log(`✅ Success: ${displayTitle} [$${cleanPrice}]`);

    return new Response(
      JSON.stringify({
        title: displayTitle,
        description: richDescription, // Rich description for weight matching
        image: image,
        price: cleanPrice,
        suggested_price: suggestedPrice,
        category: category,
        url: url,
        success: !!(image || displayTitle || suggestedPrice)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: 'Could not fetch metadata', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
