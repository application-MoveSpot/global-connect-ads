-- Allow authenticated users (advertisers) to view approved campaign periods
-- for the booking calendar availability check.
-- The existing anon policy covers public previews; this covers logged-in advertisers.
DROP POLICY IF EXISTS "Authenticated can view approved campaign periods" ON public.campaign_requests;
CREATE POLICY "Authenticated can view approved campaign periods"
  ON public.campaign_requests FOR SELECT
  TO authenticated
  USING (status = 'approved');
