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
        
        // Extract price - prioritize og:price or the main listing price
        let price = "0";
        // 1. Try og:price:amount meta tag (most reliable for the main listing)
        const ogPriceMatch = html.match(/property="og:price:amount"\s+content="([^"]+)"/i) ||
                             html.match(/content="([^"]+)"\s+property="og:price:amount"/i);
        if (ogPriceMatch) {
            price = ogPriceMatch[1];
        } else {
            // 2. Try eBay's BIN price pattern: "US $XX.XX" near the main listing area
            // Look for the price in the itemprop="price" attribute
            const itemPriceMatch = html.match(/itemprop="price"\s+content="([^"]+)"/i) ||
                                   html.match(/content="([^"]+)"\s+itemprop="price"/i);
            if (itemPriceMatch) {
                price = itemPriceMatch[1];
            } else {
                // 3. Try JSON-LD but only from Product schema (not promoted items)
                const productJsonLd = html.match(/"@type"\s*:\s*"Product"[^}]*?"price"\s*:\s*"?([0-9.]+)"?/s);
                if (productJsonLd) {
                    price = productJsonLd[1];
                } else {
                    // 4. Fallback: US $XX.XX pattern
                    const priceMatch = html.match(/US\s+\$([0-9,]+(?:\.[0-9]{2})?)/);
                    if (priceMatch) {
                        price = priceMatch[1].replace(/,/g, '');
                    }
                }
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
// 1. معالج Adidas (Direct Fetch with OG tags) 👟
// ==========================================
async function handleAdidas(url: string) {
    console.log("⚡ Strategy: Adidas Direct Fetch");
    try {
        // Extract SKU from URL for image fallback
        const skuMatch = url.match(/\/([A-Z0-9]{6,7})\.html/);
        const sku = skuMatch ? skuMatch[1] : "";
        
        // Try direct fetch with multiple User-Agents
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            });
            
            html = await response.text();
            
            // Check if we got blocked
            if (!html.includes("Unable to give you access") && 
                !html.includes("Access Denied") &&
                !html.includes("Just a moment")) {
                success = true;
                console.log("✅ Adidas: Success with UA:", userAgent.substring(0, 30));
                break;
            }
            console.log("⚠️ Adidas: Blocked with UA:", userAgent.substring(0, 30));
        }
        
        let title = "Adidas Product";
        let price = "0";
        let image = "";
        
        if (success) {
            // Extract OG title
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:title"/i);
            if (ogTitleMatch) {
                title = ogTitleMatch[1].split('|')[0].split(' - adidas')[0].trim();
            }
            
            // Extract OG image
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:image"/i);
            if (ogImageMatch) {
                image = ogImageMatch[1];
                // Enhance image quality
                image = image.replace(/w_\d+/, 'w_800').replace(/h_\d+/, 'h_800');
            }
            
            // Extract price from JSON-LD or page content
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) {
                price = jsonLdMatch[1];
            } else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) {
                    price = priceMatch[1].replace(/,/g, '');
                }
            }
        }
        
        // Fallback: construct image from SKU if no OG image
        if (!image && sku) {
            image = `https://assets.adidas.com/images/w_800,f_auto,q_auto/${sku}_01_standard.jpg`;
            console.log("✅ Adidas: Built image from SKU:", sku);
        }
        
        // Fallback: extract title from URL
        if (title === "Adidas Product" && sku) {
            const urlParts = url.split('/');
            const nameSlug = urlParts[urlParts.length - 2] || "adidas-product";
            title = "Adidas " + nameSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        console.log("✅ Adidas extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from Adidas", image, price, url };
    } catch (e) { 
        console.error("❌ Adidas handler error:", e);
        
        // Fallback to URL pattern only
        const skuMatch = url.match(/\/([A-Z0-9]{6,7})\.html/);
        if (skuMatch) {
            const sku = skuMatch[1];
            const urlParts = url.split('/');
            const nameSlug = urlParts[urlParts.length - 2] || "adidas-product";
            const title = "Adidas " + nameSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const image = `https://assets.adidas.com/images/w_800,f_auto,q_auto/${sku}_01_standard.jpg`;
            return { title, description: `Adidas SKU: ${sku}`, image, price: "0", url };
        }
        return null; 
    }
}

// ==========================================
// 2. معالج Tommy Hilfiger (Jina AI + Fallback) 🔴
// ==========================================
async function handleTommy(url: string) {
    console.log("⚡ Strategy: Tommy Jina AI Handler");
    try {
        // Use Jina AI to bypass anti-bot
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
        const text = await res.text();
        
        let title = "Tommy Hilfiger Product";
        let price = "0";
        let image = "";
        
        // Extract title from Jina response
        const titleMatch = text.match(/^Title:\s*(.+)$/m);
        if (titleMatch) {
            title = titleMatch[1]
                .replace(/\s*\|\s*Tommy Hilfiger.*/i, '')
                .replace(/\s*-\s*Tommy Hilfiger.*/i, '')
                .trim();
        }
        
        // Extract price - look for USD patterns
        const pricePatterns = [
            /\$([0-9,]+(?:\.[0-9]{2})?)/,
            /USD\s*([0-9,]+(?:\.[0-9]{2})?)/i,
            /Price[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i,
            /Now\s*\$([0-9,]+(?:\.[0-9]{2})?)/i,
        ];
        
        for (const pattern of pricePatterns) {
            const match = text.match(pattern);
            if (match) {
                price = match[1].replace(/,/g, '');
                console.log("✅ Tommy: Found price:", price);
                break;
            }
        }
        
        // Extract image - look for Scene7 or Tommy CDN images
        const imgPatterns = [
            /!\[.*?\]\((https?:\/\/shoptommy\.scene7\.com[^\)]+)\)/,
            /!\[.*?\]\((https?:\/\/[^\)]*tommy[^\)]*\.(jpg|png|webp)[^\)]*)\)/i,
            /(https?:\/\/shoptommy\.scene7\.com\/is\/image\/ShopTommy\/[^\s"'<>]+)/,
        ];
        
        for (const pattern of imgPatterns) {
            const match = text.match(pattern);
            if (match) {
                image = match[1];
                console.log("✅ Tommy: Found image from Jina");
                break;
            }
        }
        
        // Fallback: construct Scene7 image from SKU in URL
        if (!image) {
            const skuMatch = url.match(/\/([A-Z0-9]+-[A-Z0-9]+)\.html/i);
            if (skuMatch) {
                const sku = skuMatch[1].replace('-', '_');
                image = `https://shoptommy.scene7.com/is/image/ShopTommy/${sku}_main`;
                console.log("✅ Tommy: Built image from SKU:", sku);
            }
        }
        
        // Enhance Scene7 image quality
        if (image && image.includes('scene7.com')) {
            // Remove existing params and add high quality ones
            const baseUrl = image.split('?')[0];
            image = `${baseUrl}?wid=1200&hei=1200&fmt=jpeg&qlt=90`;
        }

        console.log("✅ Tommy extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from Tommy Hilfiger", image, price, url };
    } catch (e) { 
        console.error("❌ Tommy handler error:", e);
        
        // Fallback to URL pattern only
        const match = url.match(/\/([A-Z0-9]+-[A-Z0-9]+)\.html/i);
        if (match) {
            const sku = match[1].replace('-', '_');
            const image = `https://shoptommy.scene7.com/is/image/ShopTommy/${sku}_main?wid=1200&hei=1200&fmt=jpeg&qlt=90`;
            return { title: `Tommy Hilfiger - ${match[1]}`, description: "Imported from Tommy Hilfiger", image, price: "0", url };
        }
        return null; 
    }
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
// 6. معالج iHerb (Direct Fetch + Jina Fallback) 🌿
// ==========================================
async function handleIherb(url: string) {
    console.log("⚡ Strategy: iHerb Multi-Strategy Handler");
    
    let title = "iHerb Product";
    let price = "0";
    let image = "";
    
    try {
        // STRATEGY 1: Try direct fetch with multiple User-Agents
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        ];
        
        let html = "";
        let directSuccess = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            });
            
            html = await response.text();
            
            // Check if we got blocked by Cloudflare
            if (!html.includes("Just a moment") && 
                !html.includes("Checking your browser") &&
                html.includes("og:title")) {
                directSuccess = true;
                console.log("✅ iHerb: Direct fetch success");
                break;
            }
        }
        
        if (directSuccess) {
            // Extract from HTML
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:title"/i);
            if (ogTitleMatch) {
                title = ogTitleMatch[1].replace(/\s*-\s*iHerb.*/i, '').split('|')[0].trim();
            }
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:image"/i);
            if (ogImageMatch) {
                image = ogImageMatch[1];
            }
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) {
                price = jsonLdMatch[1];
            }
        } else {
            // STRATEGY 2: Try Jina AI as fallback
            console.log("⚠️ iHerb: Trying Jina fallback");
            try {
                const jinaUrl = `https://r.jina.ai/${url}`;
                const res = await fetch(jinaUrl, { 
                    headers: { "X-No-Cache": "true" },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                const text = await res.text();
                
                // Check if Jina was blocked too
                if (!text.includes("Just a moment") && !text.includes("Checking your browser")) {
                    const titleMatch = text.match(/^Title:\s*(.+)$/m);
                    if (titleMatch) {
                        title = titleMatch[1].replace(/\s*-\s*iHerb.*/i, '').split('|')[0].trim();
                    }
                    
                    // Extract price
                    const priceMatch = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                    if (priceMatch) {
                        price = priceMatch[1].replace(/,/g, '');
                        console.log("✅ iHerb: Jina found price:", price);
                    }
                    
                    // Extract image from Jina markdown
                    const imgMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+cloudinary[^\)]+)\)/i) ||
                                     text.match(/!\[.*?\]\((https?:\/\/[^\)]+images-iherb[^\)]+)\)/i) ||
                                     text.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
                    if (imgMatch) {
                        image = imgMatch[1];
                        console.log("✅ iHerb: Jina found image");
                    }
                }
            } catch (jinaError) {
                console.log("⚠️ iHerb: Jina fallback failed");
            }
        }
        
        // STRATEGY 3: Extract product info from URL as last resort
        if (title === "iHerb Product" || !image) {
            const urlMatch = url.match(/\/pr\/([^\/]+)\/(\d+)/);
            if (urlMatch) {
                const productSlug = urlMatch[1];
                const productId = urlMatch[2];
                
                if (title === "iHerb Product") {
                    // Convert slug to title
                    title = productSlug.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                }
                
                // Try to construct image URL from product ID
                if (!image) {
                    image = `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/new/d/${productId}-0.jpg`;
                    console.log("✅ iHerb: Built image from product ID");
                }
            }
        }

        console.log("✅ iHerb extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from iHerb", image, price, url };
    } catch (e) { 
        console.error("❌ iHerb handler error:", e);
        return null; 
    }
}

// ==========================================
// 7. معالج Nike (Direct Fetch + OG tags) ✔️
// ==========================================
async function handleNike(url: string) {
    console.log("⚡ Strategy: Nike Direct Fetch");
    try {
        // Try direct fetch with multiple User-Agents
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            });
            
            html = await response.text();
            
            // Check if we got valid content (not blocked)
            if (html.includes("og:title") || html.includes("og:image")) {
                success = true;
                console.log("✅ Nike: Success with UA:", userAgent.substring(0, 30));
                break;
            }
            console.log("⚠️ Nike: No OG tags with UA:", userAgent.substring(0, 30));
        }
        
        let title = "Nike Product";
        let price = "0";
        let image = "";
        
        if (success) {
            // Extract OG title
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:title"/i);
            if (ogTitleMatch) {
                title = ogTitleMatch[1].split('|')[0].split(' - Nike')[0].trim();
            } else {
                // Fallback to <title> tag
                const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleTagMatch) {
                    title = titleTagMatch[1].split('|')[0].split(' - Nike')[0].trim();
                }
            }
            
            // Extract OG image
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:image"/i);
            if (ogImageMatch) {
                image = ogImageMatch[1];
            }
            
            // Fallback: Look for Nike CDN images
            if (!image) {
                const nikeImgMatch = html.match(/https:\/\/static\.nike\.com\/[^\s"'<>]+/i);
                if (nikeImgMatch) {
                    image = nikeImgMatch[0];
                }
            }
            
            // Extract price from JSON-LD or page content
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) {
                price = jsonLdMatch[1];
            } else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) {
                    price = priceMatch[1].replace(/,/g, '');
                }
            }
        }
        
        // Fallback: Extract SKU from URL for title
        if (title === "Nike Product") {
            const match = url.match(/\/([A-Z0-9]{2}\d{4}-\d{3})/);
            if (match) {
                title = `Nike - ${match[1]}`;
            } else {
                // Try to get name from URL path
                const pathMatch = url.match(/\/t\/([^\/]+)\//);
                if (pathMatch) {
                    title = "Nike " + pathMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
            }
        }

        console.log("✅ Nike extracted:", { title, image: image ? "found" : "not found", price });
        
        return { title, description: "Imported from Nike", image, price, url };
    } catch (e) { 
        console.error("❌ Nike handler error:", e);
        
        // Fallback to SKU-based name
        const match = url.match(/\/([A-Z0-9]{2}\d{4}-\d{3})/);
        if (match) {
            const sku = match[1];
            return { title: `Nike - ${sku}`, description: "Imported Nike Product", image: "", price: "0", url };
        }
        return null; 
    }
}

// ==========================================
// 8. معالج Walmart 🏪
// ==========================================
async function handleWalmart(url: string) {
    console.log("⚡ Strategy: Walmart Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            });
            html = await response.text();
            if (html.includes("og:title") || html.includes("og:image")) {
                success = true;
                console.log("✅ Walmart: Success with UA:", userAgent.substring(0, 30));
                break;
            }
        }
        
        let title = "Walmart Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:title"/i);
            if (ogTitleMatch) {
                title = ogTitleMatch[1].split('|')[0].split(' - Walmart')[0].trim();
            }
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                                 html.match(/content="([^"]+)"\s+property="og:image"/i);
            if (ogImageMatch) {
                image = ogImageMatch[1];
                // Enhance Walmart image quality
                if (image.includes('i5.walmartimages.com')) {
                    image = image.replace(/odnHeight=\d+/, 'odnHeight=800').replace(/odnWidth=\d+/, 'odnWidth=800');
                }
            }
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) {
                price = jsonLdMatch[1];
            } else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) price = priceMatch[1].replace(/,/g, '');
            }
        } else {
            // Fallback to Jina
            const jinaUrl = `https://r.jina.ai/${url}`;
            const res = await fetch(jinaUrl, { headers: { "X-No-Cache": "true" } });
            const text = await res.text();
            
            const titleMatch = text.match(/^Title:\s*(.+)$/m);
            if (titleMatch) title = titleMatch[1].split('|')[0].split(' - Walmart')[0].trim();
            
            const imgMatch = text.match(/!\[.*?\]\((https?:\/\/i5\.walmartimages\.com[^\)]+)\)/);
            if (imgMatch) image = imgMatch[1];
            
            const priceMatch = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (priceMatch) price = priceMatch[1].replace(/,/g, '');
        }

        console.log("✅ Walmart extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Walmart", image, price, url };
    } catch (e) { 
        console.error("❌ Walmart handler error:", e);
        return null; 
    }
}

// ==========================================
// 9. معالج Puma 🐆
// ==========================================
async function handlePuma(url: string) {
    console.log("⚡ Strategy: Puma Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title") && !html.includes("Access Denied")) {
                success = true;
                console.log("✅ Puma: Success");
                break;
            }
        }
        
        let title = "Puma Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
            else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) price = priceMatch[1].replace(/,/g, '');
            }
        }
        
        // SKU fallback from URL
        if (!image) {
            const skuMatch = url.match(/(\d{6,})/);
            if (skuMatch) {
                image = `https://images.puma.com/image/upload/f_auto,q_auto,w_800/${skuMatch[1]}.png`;
                console.log("✅ Puma: Built image from SKU");
            }
        }

        console.log("✅ Puma extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Puma", image, price, url };
    } catch (e) { 
        console.error("❌ Puma handler error:", e);
        return null; 
    }
}

// ==========================================
// 10. معالج Reebok 🏃
// ==========================================
async function handleReebok(url: string) {
    console.log("⚡ Strategy: Reebok Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title")) {
                success = true;
                break;
            }
        }
        
        let title = "Reebok Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' - Reebok')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
        }
        
        // SKU fallback from URL (Reebok uses similar pattern to Adidas)
        const skuMatch = url.match(/\/([A-Z0-9]{6,7})$/);
        if (!image && skuMatch) {
            image = `https://assets.reebok.com/images/w_800,f_auto,q_auto/${skuMatch[1]}_01_standard.jpg`;
        }

        console.log("✅ Reebok extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Reebok", image, price, url };
    } catch (e) { 
        console.error("❌ Reebok handler error:", e);
        return null; 
    }
}

// ==========================================
// 11. معالج Under Armour 💪
// ==========================================
async function handleUnderArmour(url: string) {
    console.log("⚡ Strategy: Under Armour Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title") && !html.includes("Access Denied")) {
                success = true;
                console.log("✅ Under Armour: Success");
                break;
            }
        }
        
        let title = "Under Armour Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
            else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) price = priceMatch[1].replace(/,/g, '');
            }
        }

        console.log("✅ Under Armour extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Under Armour", image, price, url };
    } catch (e) { 
        console.error("❌ Under Armour handler error:", e);
        return null; 
    }
}

// ==========================================
// 12. معالج Skechers 👟
// ==========================================
async function handleSkechers(url: string) {
    console.log("⚡ Strategy: Skechers Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title") && !html.includes("Just a moment")) {
                success = true;
                break;
            }
        }
        
        let title = "Skechers Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
        }
        
        // Fallback: Extract from URL
        if (title === "Skechers Product") {
            const pathMatch = url.match(/\/([^\/]+)$/);
            if (pathMatch) {
                title = "Skechers " + pathMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }

        console.log("✅ Skechers extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Skechers", image, price, url };
    } catch (e) { 
        console.error("❌ Skechers handler error:", e);
        return null; 
    }
}

// ==========================================
// 13. معالج B&H Photo Video 📷
// ==========================================
async function handleBHPhoto(url: string) {
    console.log("⚡ Strategy: B&H Photo Direct Fetch");
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept": "text/html",
            }
        });
        const html = await response.text();
        
        let title = "B&H Photo Product";
        let price = "0";
        let image = "";
        
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' | B&H')[0].trim();
        
        const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch) image = ogImageMatch[1];
        
        // B&H specific image pattern
        if (!image) {
            const bhImgMatch = html.match(/https:\/\/static\.bhphoto\.com\/images\/images\d+x\d+\/[^\s"'<>]+/i);
            if (bhImgMatch) image = bhImgMatch[0];
        }
        
        const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
        if (jsonLdMatch) price = jsonLdMatch[1];
        else {
            const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (priceMatch) price = priceMatch[1].replace(/,/g, '');
        }

        console.log("✅ B&H Photo extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from B&H Photo", image, price, url };
    } catch (e) { 
        console.error("❌ B&H Photo handler error:", e);
        return null; 
    }
}

// ==========================================
// 14. معالج Newegg 🖥️
// ==========================================
async function handleNewegg(url: string) {
    console.log("⚡ Strategy: Newegg Direct Fetch");
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept": "text/html",
            }
        });
        const html = await response.text();
        
        let title = "Newegg Product";
        let price = "0";
        let image = "";
        
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' - Newegg')[0].trim();
        
        const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch) {
            image = ogImageMatch[1];
            // Enhance Newegg image
            if (image.includes('newegg.com')) {
                image = image.replace(/\/A-(\d+)\//, '/A-$1/').replace('_100', '_800');
            }
        }
        
        const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
        if (jsonLdMatch) price = jsonLdMatch[1];
        else {
            const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (priceMatch) price = priceMatch[1].replace(/,/g, '');
        }

        console.log("✅ Newegg extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Newegg", image, price, url };
    } catch (e) { 
        console.error("❌ Newegg handler error:", e);
        return null; 
    }
}

// ==========================================
// 15. معالج Best Buy 🛒
// ==========================================
async function handleBestBuy(url: string) {
    console.log("⚡ Strategy: Best Buy Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title") && !html.includes("Access Denied")) {
                success = true;
                break;
            }
        }
        
        let title = "Best Buy Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' - Best Buy')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
            else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) price = priceMatch[1].replace(/,/g, '');
            }
        }
        
        // Fallback: Extract SKU from URL
        const skuMatch = url.match(/\/(\d{7})\.p/);
        if (!image && skuMatch) {
            image = `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${skuMatch[1].substring(0,4)}/${skuMatch[1]}_sd.jpg`;
        }

        console.log("✅ Best Buy extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Best Buy", image, price, url };
    } catch (e) { 
        console.error("❌ Best Buy handler error:", e);
        return null; 
    }
}

// ==========================================
// 16. معالج Apple 🍎
// ==========================================
async function handleApple(url: string) {
    console.log("⚡ Strategy: Apple Direct Fetch");
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept": "text/html",
            }
        });
        const html = await response.text();
        
        let title = "Apple Product";
        let price = "0";
        let image = "";
        
        // Apple uses og:title reliably
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                             html.match(/content="([^"]+)"\s+property="og:title"/i);
        if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' - Apple')[0].trim();
        
        const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                             html.match(/content="([^"]+)"\s+property="og:image"/i);
        if (ogImageMatch) image = ogImageMatch[1];
        
        // Fallback: Look for Apple Store images
        if (!image) {
            const appleImgMatch = html.match(/https:\/\/store\.storeimages\.cdn-apple\.com[^\s"'<>]+/i);
            if (appleImgMatch) image = appleImgMatch[0];
        }
        
        // Extract price
        const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
        if (jsonLdMatch) price = jsonLdMatch[1];
        else {
            const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (priceMatch) price = priceMatch[1].replace(/,/g, '');
        }

        console.log("✅ Apple extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Apple", image, price, url };
    } catch (e) { 
        console.error("❌ Apple handler error:", e);
        return null; 
    }
}

// ==========================================
// 17. معالج Google Store 🔵
// ==========================================
async function handleGoogleStore(url: string) {
    console.log("⚡ Strategy: Google Store Direct Fetch");
    try {
        const userAgents = [
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
        ];
        
        let html = "";
        let success = false;
        
        for (const userAgent of userAgents) {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" }
            });
            html = await response.text();
            if (html.includes("og:title")) {
                success = true;
                break;
            }
        }
        
        let title = "Google Store Product";
        let price = "0";
        let image = "";
        
        if (success) {
            const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch) title = ogTitleMatch[1].split('|')[0].split(' - Google')[0].trim();
            
            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) image = ogImageMatch[1];
            
            const jsonLdMatch = html.match(/"price"\s*:\s*"?([0-9.]+)"?/);
            if (jsonLdMatch) price = jsonLdMatch[1];
            else {
                const priceMatch = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
                if (priceMatch) price = priceMatch[1].replace(/,/g, '');
            }
        }
        
        // Fallback from URL
        if (title === "Google Store Product") {
            const pathMatch = url.match(/product\/([^\/\?]+)/);
            if (pathMatch) {
                title = "Google " + pathMatch[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }

        console.log("✅ Google Store extracted:", { title, image: image ? "found" : "not found", price });
        return { title, description: "Imported from Google Store", image, price, url };
    } catch (e) { 
        console.error("❌ Google Store handler error:", e);
        return null; 
    }
}

// ==========================================
// 18. المعالج العام (لباقي المواقع) 🌐
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
        // Upgrade eBay thumbnails to high-res
        if (image.includes('ebayimg.com') && image.includes('/s-l')) {
            image = image.replace(/s-l\d+\./, 's-l1600.');
        }

        // For eBay: look for "US $XX.XX" which is the main listing price pattern
        let price = "0";
        if (url.includes("ebay.")) {
            // eBay main listing price appears as "US $38.00" in page text
            const ebayPriceMatch = text.match(/US\s+\$([0-9,]+(?:\.[0-9]{2})?)/);
            if (ebayPriceMatch) {
                price = ebayPriceMatch[1].replace(/,/g, '');
            }
        }
        if (price === "0") {
            const priceMatch = text.match(/(\$|USD)\s?([0-9,]+(\.[0-9]{2})?)/i);
            price = priceMatch ? priceMatch[2].replace(/,/g, '') : "0";
        }

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
        result = await handleAdidas(url);
    } else if (url.includes("tommy.")) {
        result = await handleTommy(url);
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
    } else if (url.includes("walmart.")) {
        result = await handleWalmart(url);
    } else if (url.includes("puma.")) {
        result = await handlePuma(url);
    } else if (url.includes("reebok.")) {
        result = await handleReebok(url);
    } else if (url.includes("underarmour.")) {
        result = await handleUnderArmour(url);
    } else if (url.includes("skechers.")) {
        result = await handleSkechers(url);
    } else if (url.includes("bhphotovideo.")) {
        result = await handleBHPhoto(url);
    } else if (url.includes("newegg.")) {
        result = await handleNewegg(url);
    } else if (url.includes("bestbuy.")) {
        result = await handleBestBuy(url);
    } else if (url.includes("apple.com/shop") || url.includes("apple.com/us/shop")) {
        result = await handleApple(url);
    } else if (url.includes("store.google.")) {
        result = await handleGoogleStore(url);
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
