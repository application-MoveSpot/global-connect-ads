ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_period_end timestamptz;

CREATE OR REPLACE VIEW public.public_provider_profiles
WITH (security_invoker = false, security_barrier = true) AS
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
WHERE status = 'approved'
  AND stripe_subscription_status IN ('active', 'trialing');

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;
GRANT ALL ON public.public_provider_profiles TO service_role;
