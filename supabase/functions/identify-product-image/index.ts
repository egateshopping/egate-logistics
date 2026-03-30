import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: `Identify this product and respond with ONLY a JSON object (no markdown, no explanation):
{
  "productName": "exact product name in English",
  "brand": "brand name or empty string",
  "category": "one of: shoes, clothing, electronics, supplements, cosmetics, fragrance, bags, watches, sports, baby_clothing, car_parts, home, other",
  "searchQuery": "best Amazon search query for this product",
  "estimatedPrice": "estimated price range in USD like $20-$50",
  "confidence": "high/medium/low"
}`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      result = {
        productName: 'Product identified',
        brand: '',
        category: 'other',
        searchQuery: 'product',
        estimatedPrice: 'Unknown',
        confidence: 'low',
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
