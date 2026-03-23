import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Use 17track API (publicly accessible JSON endpoint) for tracking
async function fetchFrom17Track(trackingNumber: string, carrier: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  try {
    // 17track has a public tracking page we can scrape via Jina with retry
    const trackUrl = `https://t.17track.net/en#nums=${trackingNumber}`;
    
    // Try Jina first
    const jinaUrl = `https://r.jina.ai/${trackUrl}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": "text/html,application/xhtml+xml",
      }
    });
    
    if (res.ok) {
      const text = await res.text();
      console.log('17track response length:', text.length);
      console.log('17track preview:', text.substring(0, 1500));
      return parseTrackingText(text);
    }
    console.log('17track Jina failed:', res.status);
    return null;
  } catch (e) {
    console.error('17track error:', e);
    return null;
  }
}

// Try DHL direct API (public, no key needed for basic tracking)
async function fetchDHLTracking(trackingNumber: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  try {
    // DHL has a public unified tracking API endpoint
    const url = `https://www.dhl.com/utapi?trackingNumber=${trackingNumber}&language=en&requesterCountryCode=US`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENTS[0],
        'Accept': 'application/json',
        'Referer': 'https://www.dhl.com/',
      }
    });

    if (!res.ok) {
      console.log('DHL utapi failed:', res.status);
      const body = await res.text();
      console.log('DHL response:', body.substring(0, 500));
      return null;
    }

    const data = await res.json();
    console.log('DHL API response:', JSON.stringify(data).substring(0, 2000));
    
    // Parse DHL unified tracking response
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
        if (latestEvent.description) {
          status = latestEvent.description;
        }
      }

      // Format timestamp
      if (lastUpdate) {
        try {
          const d = new Date(lastUpdate);
          lastUpdate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {}
      }

      return { lastLocation, lastUpdate, status };
    }
    return null;
  } catch (e) {
    console.error('DHL API error:', e);
    return null;
  }
}

// FedEx doesn't have a simple public API, so we try scraping via Jina
async function fetchFedExTracking(trackingNumber: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  try {
    const trackUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    const jinaUrl = `https://r.jina.ai/${trackUrl}`;
    
    const res = await fetch(jinaUrl, {
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": "text/plain",
        "X-No-Cache": "true",
      }
    });

    if (!res.ok) {
      console.log('FedEx Jina failed:', res.status);
      // Fallback to 17track
      return await fetchFrom17Track(trackingNumber, 'FedEx');
    }

    const text = await res.text();
    console.log('FedEx response length:', text.length);
    console.log('FedEx preview:', text.substring(0, 1500));
    
    return parseTrackingText(text) || await fetchFrom17Track(trackingNumber, 'FedEx');
  } catch (e) {
    console.error('FedEx scrape error:', e);
    return await fetchFrom17Track(trackingNumber, 'FedEx');
  }
}

function parseTrackingText(text: string): { lastLocation: string; lastUpdate: string; status: string } | null {
  let lastLocation = '';
  let lastUpdate = '';
  let status = '';

  // Pattern 1: Date + status + location lines
  const eventPattern = /(\d{1,2}[\/.-]\w{3,9}[\/.-]\d{2,4})\s+(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)\s+([^\n]+)/g;
  const events = [...text.matchAll(eventPattern)];
  if (events.length > 0) {
    const latest = events[0];
    lastUpdate = `${latest[1]} ${latest[2]}`;
    const detail = latest[3].trim();
    const parts = detail.split(/\s{2,}|\t|--/);
    if (parts.length >= 2) {
      lastLocation = parts[0].trim();
      status = parts.slice(1).join(' ').trim();
    } else {
      status = detail;
    }
  }

  // Pattern 2: Common tracking statuses
  if (!status) {
    const statusPatterns = [
      /(delivered|in transit|picked up|out for delivery|shipment information received|departed|arrived|cleared customs|customs clearance|processing|label created|on fedex vehicle|at local fedex|international shipment release|at destination)/i,
    ];
    for (const pat of statusPatterns) {
      const m = text.match(pat);
      if (m) {
        status = m[0].trim();
        break;
      }
    }
  }

  // Pattern 3: Location
  if (!lastLocation) {
    const locMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,})/);
    if (locMatch) lastLocation = locMatch[1];
  }

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

    console.log(`Tracking ${carrier}: ${trackingNumber}`);

    let result = null;

    if (carrier === 'DHL') {
      // Try DHL's public tracking API first
      result = await fetchDHLTracking(trackingNumber);
      if (!result) {
        // Fallback to 17track
        result = await fetchFrom17Track(trackingNumber, 'DHL');
      }
    } else if (carrier === 'FedEx') {
      result = await fetchFedExTracking(trackingNumber);
    } else {
      // For any other carrier, try 17track
      result = await fetchFrom17Track(trackingNumber, carrier);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not retrieve tracking info. Try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          carrier,
          trackingNumber,
          ...result,
        }
      }),
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
