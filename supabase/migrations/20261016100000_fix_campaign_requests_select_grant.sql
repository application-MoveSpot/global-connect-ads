-- Fix: migration 20260814120000 revoked table-level SELECT on campaign_requests
-- from authenticated, leaving only column-level grants.  PostgREST requires
-- table-level SELECT to answer any REST query; column-level grants alone cause
-- "permission denied for table campaign_requests" for every authenticated query.
--
-- Row access is already controlled by RLS policies (advertisers see only their
-- own rows, owners see only rows for their vehicles).  Hiding individual Stripe
-- columns is not needed at the privilege layer because:
--   - client-side queries never request those columns
--   - admin server functions use supabaseAdmin (service role) which bypasses RLS
--
-- Re-grant table-level SELECT so PostgREST can evaluate RLS policies correctly.

GRANT SELECT ON public.campaign_requests TO authenticated;
