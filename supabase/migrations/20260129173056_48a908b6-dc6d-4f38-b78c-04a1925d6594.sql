-- Add default dimension columns to shipping_weight_rules
ALTER TABLE public.shipping_weight_rules 
ADD COLUMN IF NOT EXISTS default_length numeric,
ADD COLUMN IF NOT EXISTS default_width numeric,
ADD COLUMN IF NOT EXISTS default_height numeric;