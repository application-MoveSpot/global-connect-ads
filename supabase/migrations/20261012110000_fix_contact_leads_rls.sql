-- Fix contact_leads RLS: restrict service_role_all policy to service_role only
-- The original policy was missing TO service_role, causing it to apply to {public}
-- which allowed any anonymous or authenticated user to read/write all contact leads.

DROP POLICY IF EXISTS "service_role_all" ON public.contact_leads;
CREATE POLICY "service_role_all" ON public.contact_leads
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Belt-and-suspenders: explicitly deny anon and authenticated access
DROP POLICY IF EXISTS "Deny public access to contact_leads" ON public.contact_leads;
CREATE POLICY "Deny public access to contact_leads"
  ON public.contact_leads AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
