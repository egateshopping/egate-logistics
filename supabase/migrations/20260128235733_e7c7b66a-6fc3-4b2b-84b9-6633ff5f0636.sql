-- Add other_fees columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS other_fees numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS other_fees_note text;

-- Create product_cache table for Smart Product Memory
CREATE TABLE public.product_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL UNIQUE,
  weight_lbs numeric,
  length_in numeric,
  width_in numeric,
  height_in numeric,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index on URL for fast lookups
CREATE INDEX idx_product_cache_url ON public.product_cache (url);

-- Enable RLS
ALTER TABLE public.product_cache ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for product cache
CREATE POLICY "Admins can manage product cache" 
ON public.product_cache 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_product_cache_updated_at
BEFORE UPDATE ON public.product_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();