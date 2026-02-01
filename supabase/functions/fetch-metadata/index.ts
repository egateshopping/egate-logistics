import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ==========================================
// 0. معالج Amazon (الصور المحسّنة) 📦
// ==========================================
async function handleAmazon(url: string) {
    console.log("⚡ Strategy: Amazon Jina Handler");
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();
        
        // Extract title - clean up Amazon suffix
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        let title = titleMatch ? titleMatch[1].split(' - Amazon')[0].split('|')[0].trim() : "Amazon Product";
        // Remove "Amazon.com:" prefix if present
        title = title.replace(/^Amazon\.com:\s*/i, '');
        
        // Find Amazon product images (m.media-amazon.com/images/I/)
        // Look for high-res product images, not tracking pixels
        let image = "";
        
        // Pattern 1: Look for product images in markdown format
        const amazonImgMatches = text.matchAll(/!\[.*?\]\((https?:\/\/m\.media-amazon\.com\/images\/I\/[^\)]+)\)/g);
        for (const match of amazonImgMatches) {
            const imgUrl = match[1];
            // Skip small thumbnails and tracking images
            if (!imgUrl.includes('._S') && !imgUrl.includes('._T') && !imgUrl.includes('sprite')) {
                image = imgUrl;
                // Enhance image quality if possible
                image = image.replace(/\._[A-Z]{2}\d+_\./, '._AC_SL1500_.');
                break;
            }
        }
        
        // Pattern 2: If no good image found, try direct URL pattern
        if (!image) {
            const directImgMatch = text.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%-]+\._AC_[^"\s\)]+/);
            if (directImgMatch) {
                image = directImgMatch[0];
            }
        }
        
        // Pattern 3: Look for any media-amazon image as fallback
        if (!image) {
            const fallbackMatch = text.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%-]+\.[a-z]+/i);
            if (fallbackMatch) {
                image = fallbackMatch[0];
                // Add quality suffix
                if (!image.includes('._')) {
                    image = image.replace(/\.([a-z]+)$/i, '._AC_SL1500_.$1');
                }
            }
        }

        // Extract price
        const priceMatch = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
        const price = priceMatch ? priceMatch[1].replace(/,/g, '') : "0";

        console.log("✅ Amazon extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from Amazon", image, price, url };
    } catch (e) { 
        console.error("❌ Amazon handler error:", e);
        return null; 
    }
}

// ==========================================
// 0.5. معالج eBay (Direct Fetch with OG tags) 🛒
// ==========================================
async function handleEbay(url: string) {
    console.log("⚡ Strategy: eBay Direct Fetch");
    try {
        // Try multiple User-Agent strategies
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            });
            
            html = await response.text();
            
            // Check if we got blocked
            if (!html.includes("Pardon Our Interruption") && !html.includes("Security Measure")) {
                success = true;
                console.log("✅ eBay: Success with UA:", userAgent.substring(0, 30));
                break;
            }
            console.log("⚠️ eBay: Blocked with UA:", userAgent.substring(0, 30));
        }
        
        if (!success) {
            console.log("❌ eBay: All User-Agents blocked");
            return null;
        }
        
        // Extract OG image (eBay uses og:image reliably)
        let image = "";
        const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || 
                             html.match(/content="([^"]+)"\s+property="og:image"/i);
        if (ogImageMatch) {
            image = ogImageMatch[1];
            // Upgrade to high resolution
            if (image.includes('/s-l')) {
                image = image.replace(/s-l\d+\./, 's-l1600.');
            }
        }
        
        // Fallback: Look for ebayimg URLs in page
        if (!image) {
            const ebayImgMatch = html.match(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s]+/i);
            if (ebayImgMatch) {
                image = ebayImgMatch[0];
                if (image.includes('/s-l')) {
                    image = image.replace(/s-l\d+\./, 's-l1600.');
                }
            }
        }
        
        // Extract OG title
        let title = "eBay Product";
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                             html.match(/content="([^"]+)"\s+property="og:title"/i);
        if (ogTitleMatch) {
            title = ogTitleMatch[1].split('|')[0].split(' - eBay')[0].trim();
        } else {
            // Fallback to <title> tag
            const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleTagMatch) {
                title = titleTagMatch[1].split('|')[0].split(' - eBay')[0].trim();
            }
        }
        
        // Extract price from JSON-LD or page content
        let price = "0";
        const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
        if (jsonLdMatch) {
            price = jsonLdMatch[1];
        } else {
            const priceMatch = html.match(/(?:US\s*)?\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (priceMatch) {
                price = priceMatch[1].replace(/,/g, '');
            }
        }

        console.log("✅ eBay extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from eBay", image, price, url };
    } catch (e) { 
        console.error("❌ eBay handler error:", e);
        return null; 
    }
}

// ==========================================
// 1. معالج Adidas (الرابط المباشر) 👟
// ==========================================
function handleAdidas(url: string) {
    console.log("⚡ Strategy: Adidas Direct Link");
    const skuMatch = url.match(/\/([A-Z0-9]{6})\.html/);
    const sku = skuMatch ? skuMatch[1] : "";
    
    if (sku) {
        const image = `https://assets.adidas.com/images/w_600,f_auto,q_auto/${sku}_01_standard.jpg`;
        const urlParts = url.split('/');
        const nameSlug = urlParts[urlParts.length - 2] || "adidas-product";
        const title = "Adidas " + nameSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return { title, description: `Adidas SKU: ${sku}`, image, price: "0", url };
    }
    return null;
}

// ==========================================
// 2. معالج Tommy Hilfiger (Scene7 Pattern) 🔴
// ==========================================
function handleTommy(url: string) {
    console.log("⚡ Strategy: Tommy Scene7 Link");
    const match = url.match(/([A-Z0-9]+)-([A-Z0-9]+)\.html/);
    
    if (match) {
        const rawSku = match[1];
        const scene7Sku = rawSku.replace('-', '_');
        const image = `https://shoptommy.scene7.com/is/image/ShopTommy/${scene7Sku}_main?wid=800&hei=800&fmt=jpeg`;
        const title = `Tommy Hilfiger - ${rawSku}`;
        return { title, description: `Tommy SKU: ${rawSku}`, image, price: "0", url };
    }
    return null;
}

// ==========================================
// 3. معالج Victoria's Secret (البحث الذكي عن الكود) 👙
// ==========================================
async function handleVictoriasSecret(url: string) {
    console.log("⚡ Strategy: VS Smart Jina Handler");
    try {
        const urlObj = new URL(url);
        const genericId = urlObj.searchParams.get("genericId");
        const choice = urlObj.searchParams.get("choice");
        const targetSku = (genericId && choice) ? `${genericId}${choice}` : "";

        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();

        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        const title = titleMatch ? titleMatch[1].replace("Victoria's Secret", "").trim() : "VS Product";

        let image = "";
        if (targetSku) {
            const exactImgMatch = text.match(new RegExp(`!\\[.*?\\]\\((https?://[^\\)]+${targetSku}[^\\)]+)\\)`));
            if (exactImgMatch) {
                image = exactImgMatch[1];
                console.log("✅ Found exact color match!");
            }
        }

        if (!image) {
            const anyImg = text.match(/!\[.*?\]\((https:\/\/www\.victoriassecret\.com\/p\/[^\)]+)\)/);
            image = anyImg ? anyImg[1] : "";
        }

        const priceMatch = text.match(/(\$|USD)\s?([0-9,]+(\.[0-9]{2})?)/i);
        const price = priceMatch ? priceMatch[2].replace(/,/g, '') : "0";

        return { title, description: "Imported from Victoria's Secret", image, price, url };
    } catch (e) { return null; }
}

// ==========================================
// 4. معالج Jomashop (Fetch الكلاسيكي) ⌚
// ==========================================
async function handleJomashop(url: string) {
    console.log("⚡ Strategy: Jomashop Direct Fetch");
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const html = await response.text();
        
        const imgMatch = html.match(/meta property="og:image" content="([^"]+)"/);
        const image = imgMatch ? imgMatch[1] : "";
        
        const titleMatch = html.match(/meta property="og:title" content="([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : "Jomashop Product";
        
        let price = "0";
        const priceMatch = html.match(/"price":\s?"([0-9.]+)"/) || html.match(/itemprop="price" content="([0-9.]+)"/);
        if (priceMatch) price = priceMatch[1];

        return { title, description: "Imported from Jomashop", image, price, url };
    } catch (e) { return null; }
}

// ==========================================
// 5. معالج Macy's (Jina AI المخصص) 🛍️
// ==========================================
async function handleMacys(url: string) {
    console.log("⚡ Strategy: Macy's Jina Handler");
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();
        
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        const title = titleMatch ? titleMatch[1].replace(" - Macy's", "").replace("Created for Macy's", "").trim() : "Macy's Product";

        const imgMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+macysassets[^\)]+)\)/);
        let image = imgMatch ? imgMatch[1] : "";
        
        if (!image) {
            const anyImg = text.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
            image = anyImg ? anyImg[1] : "";
        }

        const priceMatch = text.match(/(\$|USD)\s?([0-9,]+(\.[0-9]{2})?)/i);
        const price = priceMatch ? priceMatch[2].replace(/,/g, '') : "0";

        return { title, description: "Imported from Macy's", image, price, url };
    } catch (e) { return null; }
}

// ==========================================
// 6. معالج iHerb (Jina AI) 🌿
// ==========================================
async function handleIherb(url: string) {
    console.log("⚡ Strategy: iHerb Jina Handler");
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();
        
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        const title = titleMatch ? titleMatch[1].replace("- iHerb", "").trim() : "iHerb Product";
        
        const imgMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+(cloudinary|images-iherb)[^\)]+)\)/);
        const image = imgMatch ? imgMatch[1] : "";
        
        const priceMatch = text.match(/(\$|USD)\s?([0-9,]+(\.[0-9]{2})?)/i);
        const price = priceMatch ? priceMatch[2].replace(/,/g, '') : "0";

        return { title, description: "Imported from iHerb", image, price, url };
    } catch (e) { return null; }
}

// ==========================================
// 7. معالج Nike (البحث بالكود) ✔️
// ==========================================
async function handleNike(url: string) {
    console.log("⚡ Strategy: Nike SKU Search");
    const match = url.match(/\/([A-Z0-9]{2}\d{4}-\d{3})/);
    if (match) {
        const sku = match[1];
        const searchUrl = `https://duckduckgo.com/i.js?q=Nike+${sku}&o=json`;
        try {
            const res = await fetch(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return { title: `Nike - ${sku}`, description: "Imported Nike Sneaker", image: data.results[0].image, price: "0", url };
            }
        } catch (e) {}
    }
    return null;
}

// ==========================================
// 8. المعالج العام (لباقي المواقع) 🌐
// ==========================================
async function handleGeneric(url: string) {
    console.log("⚡ Strategy: Generic Jina AI");
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();
        
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        let title = titleMatch ? titleMatch[1].split('|')[0].trim() : "New Product";
        
        const imgMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        let image = imgMatch ? imgMatch[1] : "";
        
        if (image.includes('jomashop')) {
             image = image.replace('width=150', 'width=600').replace('height=150', 'height=600');
        }

        const priceMatch = text.match(/(\$|USD)\s?([0-9,]+(\.[0-9]{2})?)/i);
        const price = priceMatch ? priceMatch[2].replace(/,/g, '') : "0";

        return { title, description: "Fetched automatically", image, price, url };
    } catch (e) { return null; }
}

// ==========================================
// الموزع الرئيسي (The Router) 🚦
// ==========================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    console.log("🚀 Processing URL:", url);

    let result = null;

    if (url.includes("amazon.")) {
        result = await handleAmazon(url);
    } else if (url.includes("ebay.")) {
        result = await handleEbay(url);
    } else if (url.includes("adidas.")) {
        result = handleAdidas(url);
    } else if (url.includes("tommy.")) {
        result = handleTommy(url);
    } else if (url.includes("victoriassecret.")) {
        result = await handleVictoriasSecret(url);
    } else if (url.includes("jomashop.")) {
        result = await handleJomashop(url);
    } else if (url.includes("macys.")) {
        result = await handleMacys(url);
    } else if (url.includes("iherb.")) {
        result = await handleIherb(url);
    } else if (url.includes("nike.")) {
        result = await handleNike(url);
    }

    if (!result) {
        result = await handleGeneric(url);
    }

    if (!result || !result.image) {
        result = {
            title: "Manual Entry Required",
            description: "Could not fetch details",
            image: "https://placehold.co/600x400/e2e8f0/64748b?text=Add+Image",
            price: "0",
            url: url
        };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
