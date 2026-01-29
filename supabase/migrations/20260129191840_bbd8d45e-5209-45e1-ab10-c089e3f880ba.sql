-- Add misc_fee and misc_note columns to product_memory table
ALTER TABLE public.product_memory 
ADD COLUMN IF NOT EXISTS misc_fee numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS misc_note text DEFAULT NULL;