import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// 17track carrier codes: https://res.17track.net/asset/carrier/info/apicarrier.all.json
const CARRIER_CODES: Record<string, number> = {
  'DHL': 7011,      // DHL Express
  'FedEx': 21051,    // FedEx
  'UPS': 21061,      // UPS
  'USPS': 21051,     // USPS
  'Aramex': 21067,   // Aramex
};

async function fetchVia17Track(trackingNumber: string, carrier?: string): Promise<{ lastLocation: string; lastUpdate: string; status: string } | null> {
  const apiKey = Deno.env.get('TRACK17_API_KEY');
  if (!apiKey) {
    console.error('TRACK17_API_KEY not set');
    return null;
  }

  const headers = {
    '17token': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    const registerPayload: any = { number: trackingNumber };
    if (carrier && CARRIER_CODES[carrier]) {
      registerPayload.carrier = CARRIER_CODES[carrier];
    }
    
    console.log('Registering tracking number with 17track...', JSON.stringify(registerPayload));
    const registerRes = await fetch('https://api.17track.net/track/v2.2/register', {
      method: 'POST',
      headers,
      body: JSON.stringify([registerPayload]),
    });
    const registerData = await registerRes.json();
    console.log('17track register:', JSON.stringify(registerData));

    // Check if registered or already registered
    const accepted = registerData?.data?.accepted || [];
    const rejected = registerData?.data?.rejected || [];
    const alreadyRegistered = rejected.some((r: any) => r?.error?.code === -18019901);
    
    if (accepted.length === 0 && !alreadyRegistered) {
      console.log('17track: could not register tracking number');
      // Still try to get info in case it was registered before
    }

    // Step 2: Wait for processing (new registrations need time)
    if (accepted.length > 0) {
      console.log('Newly registered, waiting 4s for processing...');
      await new Promise(r => setTimeout(r, 4000));
    } else {
      // Already registered, shorter wait
      await new Promise(r => setTimeout(r, 1000));
    }

    // Step 3: Get tracking info
    console.log('Fetching tracking info...');
    const trackRes = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers,
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    if (!trackRes.ok) {
      console.error('17track gettrackinfo failed:', trackRes.status, await trackRes.text());
      return null;
    }

    const data = await trackRes.json();
    console.log('17track tracking response code:', data?.code);

    const tracks = data?.data?.accepted;
    if (!tracks || tracks.length === 0) {
      const rejectedInfo = data?.data?.rejected;
      console.log('17track: no tracking data. Rejected:', JSON.stringify(rejectedInfo));
      return null;
    }

    const track = tracks[0];
    const trackInfo = track?.track;
    
    // Latest events from z0 (latest status) or z1
    const events = trackInfo?.z0?.z || trackInfo?.z1?.z || [];
    
    let status = 'Unknown';
    let lastLocation = 'N/A';
    let lastUpdate = '';

    // Map status code
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

    // Get latest event
    if (events.length > 0) {
      const latest = events[0];
      // 'c' = location, 'a' = date, 'z' = description
      if (latest.c) lastLocation = latest.c;
      if (latest.a) {
        try {
          const d = new Date(latest.a);
          lastUpdate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
          lastUpdate = latest.a;
        }
      }
      if (latest.z) status = latest.z;
    }

    console.log('17track result:', { status, lastLocation, lastUpdate });
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

    const result = await fetchVia17Track(cleanTracking, carrier);

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not retrieve tracking info. The number may still be processing — try again in a minute.' }),
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
