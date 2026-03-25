import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchVia17Track(trackingNumber: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  const apiKey = Deno.env.get('TRACK17_API_KEY');
  if (!apiKey) {
    console.error('TRACK17_API_KEY not set');
    return null;
  }

  try {
    // Register the tracking number first
    const registerRes = await fetch('https://api.17track.net/track/v2.2/register', {
      method: 'POST',
      headers: {
        '17token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    const registerBody = await registerRes.text();
    console.log('17track register response:', registerRes.status, registerBody);

    if (!registerRes.ok) {
      console.log('17track register failed');
    }

    // Wait for 17track to process the registration
    await new Promise(r => setTimeout(r, 3000));

    // Get tracking info
    const trackRes = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers: {
        '17token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    if (!trackRes.ok) {
      const errBody = await trackRes.text();
      console.error('17track gettrackinfo failed:', trackRes.status, errBody);
      return null;
    }

    const data = await trackRes.json();
    console.log('17track response:', JSON.stringify(data).substring(0, 1000));

    const accepted = data?.data?.accepted;
    if (!accepted || accepted.length === 0) {
      console.log('17track: no accepted tracking data');
      // Check rejected
      const rejected = data?.data?.rejected;
      if (rejected && rejected.length > 0) {
        console.log('17track rejected:', JSON.stringify(rejected));
      }
      return null;
    }

    const track = accepted[0];
    const latestEvent = track?.track?.z0?.z || track?.track?.z1?.z;
    const trackInfo = track?.track;

    let status = 'Unknown';
    let lastLocation = 'N/A';
    let lastUpdate = '';

    // Get status from track info
    const statusMap: Record<number, string> = {
      0: 'Not Found',
      10: 'In Transit',
      20: 'Expired',
      30: 'Pick Up',
      35: 'Undelivered',
      40: 'Delivered',
      50: 'Alert',
    };

    if (trackInfo?.e !== undefined) {
      status = statusMap[trackInfo.e] || `Status ${trackInfo.e}`;
    }

    // Get latest event details
    if (latestEvent && latestEvent.length > 0) {
      const latest = latestEvent[0];
      if (latest.c) lastLocation = latest.c;
      if (latest.a) {
        lastUpdate = latest.a;
        try {
          const d = new Date(lastUpdate);
          lastUpdate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {}
      }
      if (latest.z) {
        status = latest.z;
      }
    }

    return { lastLocation, lastUpdate, status };
  } catch (e) {
    console.error('17track error:', e);
    return null;
  }
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

    const result = await fetchVia17Track(cleanTracking);

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
