-- Create product_memory table for persistent product data
CREATE TABLE public.product_memory (
  url TEXT PRIMARY KEY,
  product_title TEXT,
  image_url TEXT,
  weight NUMERIC,
  price NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_memory ENABLE ROW LEVEL SECURITY;

-- Admins can manage product memory
CREATE POLICY "Admins can manage product memory"
  ON public.product_memory
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read product memory (for customer auto-fill in future)
CREATE POLICY "Anyone can read product memory"
  ON public.product_memory
  FOR SELECT
  USING (true);

-- Create index on url for fast lookups
CREATE INDEX idx_product_memory_url ON public.product_memory(url);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_product_memory_updated_at
  BEFORE UPDATE ON public.product_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();