-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage product memory" ON public.product_memory;
DROP POLICY IF EXISTS "Anyone can read product memory" ON public.product_memory;

-- Create permissive policy for all authenticated users
CREATE POLICY "Enable all access for authenticated users"
  ON public.product_memory
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);