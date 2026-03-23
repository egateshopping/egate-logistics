ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS last_location text,
ADD COLUMN IF NOT EXISTS last_status text,
ADD COLUMN IF NOT EXISTS last_update text;