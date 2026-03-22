
-- Add missing columns to product_cache
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS actual_weight_lbs numeric;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS length numeric;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS width numeric;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS height numeric;
ALTER TABLE public.product_cache ADD COLUMN IF NOT EXISTS source text;

-- Create category_defaults table
CREATE TABLE IF NOT EXISTS public.category_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  default_weight_lbs numeric,
  default_length numeric,
  default_width numeric,
  default_height numeric
);

ALTER TABLE public.category_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read category defaults" ON public.category_defaults FOR SELECT USING (true);
CREATE POLICY "Admins can manage category defaults" ON public.category_defaults FOR ALL USING (public.has_role(auth.uid(), 'admin'));
