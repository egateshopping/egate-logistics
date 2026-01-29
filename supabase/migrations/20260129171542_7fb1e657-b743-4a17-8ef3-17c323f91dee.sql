-- Add dimension columns to product_memory table
ALTER TABLE public.product_memory 
ADD COLUMN IF NOT EXISTS length_in numeric,
ADD COLUMN IF NOT EXISTS width_in numeric,
ADD COLUMN IF NOT EXISTS height_in numeric;