-- Allow PostgREST to serve campaign_monthly_stats to the anon role.
-- RLS policy "Advertisers read own monthly stats" (advertiser_id = auth.uid())
-- ensures anon sessions (auth.uid() = NULL) see zero rows — this grant is safe.
GRANT SELECT ON public.campaign_monthly_stats TO anon;

-- Reload PostgREST schema cache immediately.
NOTIFY pgrst, 'reload schema';
