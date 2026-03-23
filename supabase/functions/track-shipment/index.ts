import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getDHLTrackingUrl(trackingNumber: string): string {
  return `https://www.dhl.com/global-en/home/tracking/tracking-global-forwarding.html?submit=1&tracking-id=${trackingNumber}`;
}

function getFedExTrackingUrl(trackingNumber: string): string {
  return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
}

function parseDHLTracking(text: string): { lastLocation: string; lastUpdate: string; status: string } | null {
  try {
    // Try to find location/status patterns from DHL page content
    // DHL typically shows "Shipment picked up" or location-based updates
    
    // Pattern: Look for location entries like "City, Country" with timestamps
    const locationPatterns = [
      /(?:Latest|Last|Current)\s*(?:Status|Location|Update)[:\s]*([^\n]+)/i,
      /(?:Departed|Arrived|Processed|Cleared|In Transit|Delivered|Picked up)[:\s]*(?:at|in|from)?\s*([A-Z][a-zA-Z\s,]+(?:,\s*[A-Z]{2,})?)[\s\n]/i,
      /(\d{1,2}[\s\/.-]\w+[\s\/.-]\d{2,4})\s*[\n\s]*([^\n]+?)(?:\n|$)/,
    ];

    let lastLocation = '';
    let lastUpdate = '';
    let status = '';

    // Look for the most recent tracking event
    // DHL format often: "Date Time | Location | Status"
    const eventPattern = /(\d{1,2}[\/.-]\w{3}[\/.-]\d{2,4})\s+(\d{1,2}:\d{2})\s+([^\n]+)/g;
    const events = [...text.matchAll(eventPattern)];
    
    if (events.length > 0) {
      const latest = events[0];
      lastUpdate = `${latest[1]} ${latest[2]}`;
      const detail = latest[3].trim();
      // Try to split location and status
      const parts = detail.split(/\s{2,}|\t|--/);
      if (parts.length >= 2) {
        lastLocation = parts[0].trim();
        status = parts.slice(1).join(' ').trim();
      } else {
        status = detail;
      }
    }

    // Fallback: look for common DHL patterns
    if (!lastLocation && !status) {
      // Try "Shipment information received" or similar
      const statusMatch = text.match(/(Shipment\s+\w+[\w\s]*?)(?:\n|\.)/i);
      if (statusMatch) {
        status = statusMatch[1].trim();
      }

      // Try to find a city/country
      const cityMatch = text.match(/(?:Origin|Destination|Location)[:\s]*([A-Za-z\s]+,\s*[A-Za-z\s]+)/i);
      if (cityMatch) {
        lastLocation = cityMatch[1].trim();
      }
    }

    // Another fallback: grab any bold or emphasized location text
    if (!lastLocation && !status) {
      const boldMatch = text.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        status = boldMatch[1].trim();
      }
    }

    if (!lastLocation && !status) return null;

    return {
      lastLocation: lastLocation || 'N/A',
      lastUpdate: lastUpdate || '',
      status: status || 'Check carrier website',
    };
  } catch (e) {
    console.error('DHL parse error:', e);
    return null;
  }
}

function parseFedExTracking(text: string): { lastLocation: string; lastUpdate: string; status: string } | null {
  try {
    let lastLocation = '';
    let lastUpdate = '';
    let status = '';

    // FedEx patterns
    const eventPattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)\s+([^\n]+)/gi;
    const events = [...text.matchAll(eventPattern)];
    
    if (events.length > 0) {
      const latest = events[0];
      lastUpdate = `${latest[1]} ${latest[2]}`;
      const detail = latest[3].trim();
      const parts = detail.split(/\s{2,}|\t/);
      if (parts.length >= 2) {
        status = parts[0].trim();
        lastLocation = parts.slice(1).join(', ').trim();
      } else {
        status = detail;
      }
    }

    if (!lastLocation && !status) {
      const statusMatch = text.match(/(In transit|Delivered|Picked up|On FedEx vehicle|At local FedEx|Shipment information|Label created|International shipment release)[^\n]*/i);
      if (statusMatch) {
        status = statusMatch[0].trim();
      }

      const locMatch = text.match(/(?:from|in|at)\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/i);
      if (locMatch) {
        lastLocation = locMatch[1].trim();
      }
    }

    if (!lastLocation && !status) return null;

    return {
      lastLocation: lastLocation || 'N/A',
      lastUpdate: lastUpdate || '',
      status: status || 'Check carrier website',
    };
  } catch (e) {
    console.error('FedEx parse error:', e);
    return null;
  }
}

// Generic fallback parser
function parseGenericTracking(text: string): { lastLocation: string; lastUpdate: string; status: string } | null {
  // Try to find any location-like text
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,})/);
  const statusMatch = text.match(/(delivered|in transit|picked up|out for delivery|shipment information|departed|arrived|cleared customs|customs|processing)/i);
  
  if (!locationMatch && !statusMatch) return null;

  return {
    lastLocation: locationMatch ? locationMatch[1] : 'N/A',
    lastUpdate: '',
    status: statusMatch ? statusMatch[1] : 'Unknown',
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

    let trackingUrl = '';
    if (carrier === 'DHL') {
      trackingUrl = getDHLTrackingUrl(trackingNumber);
    } else if (carrier === 'FedEx') {
      trackingUrl = getFedExTrackingUrl(trackingNumber);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported carrier: ${carrier}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping ${carrier} tracking for: ${trackingNumber}`);

    // Use Jina AI to scrape the tracking page
    const jinaUrl = `https://r.jina.ai/${trackingUrl}`;
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        "X-No-Cache": "true",
        "X-Wait-For-Selector": carrier === 'DHL' ? '.c-tracking-result' : '.shipment-status',
      }
    });

    if (!jinaRes.ok) {
      console.error(`Jina fetch failed: ${jinaRes.status}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch tracking page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pageText = await jinaRes.text();
    console.log(`Got ${pageText.length} chars from Jina for ${carrier}`);
    // Log first 2000 chars for debugging
    console.log('Page preview:', pageText.substring(0, 2000));

    let result = null;
    if (carrier === 'DHL') {
      result = parseDHLTracking(pageText);
    } else if (carrier === 'FedEx') {
      result = parseFedExTracking(pageText);
    }

    // Fallback to generic parser
    if (!result) {
      result = parseGenericTracking(pageText);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not parse tracking info. The carrier page may have changed format.',
          rawPreview: pageText.substring(0, 500),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          carrier,
          trackingNumber,
          lastLocation: result.lastLocation,
          lastUpdate: result.lastUpdate,
          status: result.status,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track shipment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
