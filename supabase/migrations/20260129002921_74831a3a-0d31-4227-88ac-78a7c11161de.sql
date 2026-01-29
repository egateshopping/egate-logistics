-- Create shipping weight rules table
CREATE TABLE public.shipping_weight_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_weight_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage weight rules
CREATE POLICY "Admins can manage weight rules"
ON public.shipping_weight_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read weight rules (needed for edge function)
CREATE POLICY "Anyone can read weight rules"
ON public.shipping_weight_rules
FOR SELECT
USING (true);

-- Seed initial data
INSERT INTO public.shipping_weight_rules (keyword, weight) VALUES
  ('women''s shoe', 2.0),
  ('shoe', 3.0),
  ('sneaker', 3.0),
  ('boot', 4.0),
  ('hoodie', 3.0),
  ('pant', 2.0),
  ('jeans', 2.0),
  ('trouser', 2.0);