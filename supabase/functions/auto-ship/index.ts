import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`🚀 Starting Auto-Ship sequence for: ${today}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch users with auto-ship enabled for today
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, wallet_balance, preferred_carrier, phone, address, city')
      .eq('is_auto_ship_enabled', true)
      .eq('auto_ship_day', today);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users scheduled for auto-ship today');
      return new Response(
        JSON.stringify({ message: "No users scheduled today", day: today }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${profiles.length} users scheduled for today`);
    const results = [];

    for (const user of profiles) {
      console.log(`Processing user: ${user.user_id}`);
      
      // 2. Fetch orders at warehouse ready for shipping (not yet assigned to a shipment)
      const { data: items, error: itemsError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('status', 'at_warehouse')
        .is('shipment_id', null);

      if (itemsError) {
        console.error(`Error fetching orders for user ${user.user_id}:`, itemsError);
        continue;
      }

      if (!items || items.length === 0) {
        console.log(`No items at warehouse for user ${user.user_id}`);
        continue;
      }

      console.log(`Found ${items.length} items at warehouse for user ${user.user_id}`);

      // 3. Calculate weights (actual and volumetric)
      let totalActualWeight = 0;
      let totalVolumetricWeight = 0;

      // DIM Factor: 139 for inches (or 5000 for cm)
      const DIM_FACTOR = 139;

      for (const item of items) {
        // Calculate volumetric weight: (L × W × H) / DIM_FACTOR
        const length = item.length_in || 0;
        const width = item.width_in || 0;
        const height = item.height_in || 0;
        const volWeight = (length * width * height) / DIM_FACTOR;
        
        totalActualWeight += (item.weight_lbs || 0) * (item.quantity || 1);
        totalVolumetricWeight += volWeight * (item.quantity || 1);

        // Update volumetric weight in orders table for documentation
        await supabase
          .from('orders')
          .update({ volumetric_weight: volWeight })
          .eq('id', item.id);
      }

      // 4. Determine chargeable weight (carriers charge the higher of actual vs volumetric)
      const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);
      console.log(`Weights - Actual: ${totalActualWeight.toFixed(2)} lbs, Volumetric: ${totalVolumetricWeight.toFixed(2)} lbs, Chargeable: ${chargeableWeight.toFixed(2)} lbs`);

      // 5. Calculate shipping cost
      const carrier = user.preferred_carrier || 'DHL';
      const totalCost = calculateShippingCost(chargeableWeight, carrier);
      console.log(`Total cost for ${carrier}: $${totalCost.toFixed(2)}`);

      // 6. Process payment (wallet deduction or COD)
      let paidFromWallet = 0;
      let codAmount = totalCost;
      const currentBalance = user.wallet_balance || 0;

      if (currentBalance > 0) {
        paidFromWallet = Math.min(currentBalance, totalCost);
        codAmount = totalCost - paidFromWallet;

        // Deduct from wallet
        const { error: walletError } = await supabase.rpc('decrement_wallet', {
          p_user_id: user.user_id,
          p_amount: paidFromWallet
        });

        if (walletError) {
          console.error('Error deducting from wallet:', walletError);
        } else {
          console.log(`Deducted $${paidFromWallet.toFixed(2)} from wallet. COD remaining: $${codAmount.toFixed(2)}`);
        }
      }

      // 7. Generate tracking number and create shipment
      const generatedTracking = generateInternalTracking(carrier);

      const { data: shipment, error: shipError } = await supabase
        .from('shipments')
        .insert({
          user_id: user.user_id,
          carrier: carrier,
          master_tracking_number: generatedTracking,
          status: 'Ready for Pickup',
          
          // Weight details
          total_weight: totalActualWeight,
          total_volumetric_weight: totalVolumetricWeight,
          chargeable_weight: chargeableWeight,
          
          // Cost details
          total_cost: totalCost,
          paid_from_wallet: paidFromWallet,
          cod_amount: codAmount,
          payment_status: codAmount > 0 ? 'COD Pending' : 'Paid',
          
          notes: `Auto-ship for ${today}. ${items.length} items consolidated.`
        })
        .select()
        .single();

      if (shipError) {
        console.error('Error creating shipment:', shipError);
        continue;
      }

      console.log(`Created shipment: ${shipment.id} with tracking: ${generatedTracking}`);

      // 8. Update orders to link them to the shipment and change status
      const itemIds = items.map(i => i.id);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'international_shipping', 
          shipment_id: shipment.id,
          international_tracking: generatedTracking
        })
        .in('id', itemIds);

      if (updateError) {
        console.error('Error updating orders:', updateError);
      } else {
        console.log(`Updated ${itemIds.length} orders to international_shipping status`);
      }

      results.push({ 
        user_id: user.user_id,
        user_name: user.full_name,
        tracking: generatedTracking,
        items_count: items.length,
        actual_weight: totalActualWeight,
        volumetric_weight: totalVolumetricWeight,
        chargeable_weight: chargeableWeight,
        total_cost: totalCost,
        paid_from_wallet: paidFromWallet,
        cod_amount: codAmount,
        payment_status: codAmount > 0 ? 'COD Pending' : 'Paid'
      });
    }

    console.log(`✅ Auto-ship completed. Processed ${results.length} shipments.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        day: today,
        shipments_created: results.length,
        results 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Auto-ship error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Calculate shipping cost based on chargeable weight and carrier
function calculateShippingCost(chargeableWeight: number, carrier: string): number {
  // Base rate varies by carrier
  const baseRate = carrier === 'DHL' ? 35 : 28; // FedEx default
  
  // Rate per pound (lbs)
  const ratePerLb = carrier === 'DHL' ? 8 : 7;
  
  return baseRate + (chargeableWeight * ratePerLb);
}

// Generate internal tracking number
function generateInternalTracking(carrier: string): string {
  const prefix = carrier === 'DHL' ? 'JD' : 'FED';
  const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
  return `${prefix}${randomNum}`;
}
