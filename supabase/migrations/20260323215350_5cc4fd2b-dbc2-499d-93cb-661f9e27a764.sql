ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS domestic_carrier text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS international_carrier text DEFAULT NULL;