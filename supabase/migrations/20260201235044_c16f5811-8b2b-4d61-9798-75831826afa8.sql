-- Add Auto-Ship columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_auto_ship_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_ship_day text,
ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_carrier text DEFAULT 'DHL';

-- Create shipments table for consolidated shipments
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  carrier text NOT NULL,
  master_tracking_number text,
  status text DEFAULT 'Ready for Pickup',
  
  -- Weight details
  total_weight numeric DEFAULT 0,
  total_volumetric_weight numeric DEFAULT 0,
  chargeable_weight numeric DEFAULT 0,
  
  -- Cost details
  total_cost numeric DEFAULT 0,
  paid_from_wallet numeric DEFAULT 0,
  cod_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'Pending',
  
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add shipment_id to orders for consolidation tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.shipments(id),
ADD COLUMN IF NOT EXISTS volumetric_weight numeric;

-- Enable RLS on shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Users can view their own shipments
CREATE POLICY "Users can view own shipments"
ON public.shipments
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all shipments
CREATE POLICY "Admins can view all shipments"
ON public.shipments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert shipments
CREATE POLICY "Admins can insert shipments"
ON public.shipments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update shipments
CREATE POLICY "Admins can update shipments"
ON public.shipments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage shipments (for edge function)
CREATE POLICY "Service role can manage shipments"
ON public.shipments
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create wallet decrement function
CREATE OR REPLACE FUNCTION public.decrement_wallet(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = GREATEST(0, wallet_balance - p_amount),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Create wallet increment function (for deposits)
CREATE OR REPLACE FUNCTION public.increment_wallet(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger for updated_at on shipments
CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();