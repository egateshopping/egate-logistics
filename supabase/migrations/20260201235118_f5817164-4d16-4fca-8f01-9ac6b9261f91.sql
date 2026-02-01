-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can manage shipments" ON public.shipments;

-- Add proper INSERT policy that allows service role OR admin
-- The edge function uses service role key which bypasses RLS anyway
-- So we don't need a special policy for it