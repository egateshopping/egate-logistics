import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchWithScrapingdog(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('SCRAPINGDOG_API_KEY');
  if (!apiKey) {
    console.log('SCRAPINGDOG_API_KEY not set');
    return null;
  }
  try {
    const sdUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true&wait=5000`;
    const res = await fetch(sdUrl);
    if (!res.ok) {
      console.log('Scrapingdog failed:', res.status);
      const body = await res.text();
      console.log('Scrapingdog response:', body.substring(0, 500));
      return null;
    }
    return await res.text();
  } catch (e) {
    console.error('Scrapingdog error:', e);
    return null;
  }
}

async function fetchDHLTracking(trackingNumber: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  try {
    // Try DHL public unified tracking API first
    const url = `https://www.dhl.com/utapi?trackingNumber=${trackingNumber}&language=en&requesterCountryCode=US`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.dhl.com/',
      }
    });

    if (res.ok) {
      const data = await res.json();
      const shipments = data?.shipments;
      if (shipments && shipments.length > 0) {
        const shipment = shipments[0];
        const latestEvent = shipment.events?.[0];
        const statusInfo = shipment.status;
        
        let lastLocation = 'N/A';
        let lastUpdate = '';
        let status = statusInfo?.description || statusInfo?.status || 'Unknown';

        if (latestEvent) {
          const loc = latestEvent.location;
          if (loc?.address) {
            const addr = loc.address;
            const parts = [addr.addressLocality, addr.countryCode].filter(Boolean);
            lastLocation = parts.join(', ') || 'N/A';
          }
          lastUpdate = latestEvent.timestamp || latestEvent.date || '';
          if (latestEvent.description) status = latestEvent.description;
        }

        if (lastUpdate) {
          try {
            const d = new Date(lastUpdate);
            lastUpdate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          } catch {}
        }

        return { lastLocation, lastUpdate, status };
      }
    }
    console.log('DHL utapi failed, trying Scrapingdog...');
  } catch (e) {
    console.error('DHL API error:', e);
  }

  // Fallback: scrape DHL tracking page
  const html = await fetchWithScrapingdog(`https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`);
  if (html) return parseTrackingHtml(html);
  return null;
}

async function fetchFedExTracking(trackingNumber: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  // Scrape FedEx tracking page via Scrapingdog
  const html = await fetchWithScrapingdog(`https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`);
  if (html) {
    const result = parseTrackingHtml(html);
    if (result) return result;
  }

  // Fallback: try 17track
  const html17 = await fetchWithScrapingdog(`https://t.17track.net/en#nums=${trackingNumber}`);
  if (html17) return parseTrackingHtml(html17);
  
  return null;
}

function parseTrackingHtml(html: string): { lastLocation: string; lastUpdate: string; status: string } | null {
  let status = '';
  let lastLocation = '';
  let lastUpdate = '';

  // Common status keywords
  const statusPatterns = [
    /(delivered|in transit|picked up|out for delivery|shipment information received|departed|arrived|cleared customs|customs clearance|processing|label created|on fedex vehicle|at local fedex|international shipment release|at destination|in clearance|package available|shipment exception|tendered to|ready for pickup)/i,
  ];
  for (const pat of statusPatterns) {
    const m = html.match(pat);
    if (m) {
      status = m[0].trim();
      break;
    }
  }

  // Location pattern: "City, STATE" or "City, XX"
  const locMatch = html.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3})\b/);
  if (locMatch) lastLocation = locMatch[1].trim();

  // Date patterns
  const dateMatch = html.match(/(\w{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)?)/);
  if (dateMatch) lastUpdate = dateMatch[1].trim();

  if (!status && !lastLocation) return null;

  return {
    lastLocation: lastLocation || 'N/A',
    lastUpdate: lastUpdate || '',
    status: status || 'Check carrier website',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carrier, trackingNumber } = await req.json();

    if (!carrier || !trackingNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'carrier and trackingNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTracking = trackingNumber.trim();
    console.log(`Tracking ${carrier}: ${cleanTracking}`);

    let result = null;

    if (carrier === 'DHL') {
      result = await fetchDHLTracking(cleanTracking);
    } else if (carrier === 'FedEx') {
      result = await fetchFedExTracking(cleanTracking);
    } else {
      // Generic: try 17track via Scrapingdog
      const html = await fetchWithScrapingdog(`https://t.17track.net/en#nums=${cleanTracking}`);
      if (html) result = parseTrackingHtml(html);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not retrieve tracking info. Try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: { carrier, trackingNumber: cleanTracking, ...result } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Track shipment error:', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
