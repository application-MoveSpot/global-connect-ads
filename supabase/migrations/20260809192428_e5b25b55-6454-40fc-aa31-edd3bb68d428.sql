-- 1. Fix mutable search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_wallet_transaction(uuid, text, bigint, text, text, text, text, uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_advertiser_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_owner_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_partner_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_provider_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_reject_bad_condition() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_validate_campaign_request() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_proposal_acceptance() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_advertiser_profile() FROM anon, authenticated;
-- has_role must stay callable by signed-in users (used by RLS policies and app auth checks)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Stop exposing provider PII (email, phone, siret, admin_notes) to anonymous visitors
DROP POLICY IF EXISTS "Public reads approved providers" ON public.provider_profiles;
REVOKE ALL ON TABLE public.provider_profiles FROM anon;

CREATE OR REPLACE VIEW public.public_provider_profiles
WITH (security_invoker = off) AS
SELECT
  user_id,
  company,
  full_name,
  description,
  services,
  coverage_areas,
  portfolio_urls,
  pricing_info,
  logo_url,
  website,
  created_at,
  updated_at
FROM public.provider_profiles
WHERE status = 'approved';

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;