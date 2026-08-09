-- Recreate the public directory view as a normal (invoker) view
DROP VIEW IF EXISTS public.public_provider_profiles;

-- Column-level grants: anon/authenticated may read only non-sensitive columns
GRANT SELECT (
  user_id, company, full_name, description, services, coverage_areas,
  portfolio_urls, pricing_info, logo_url, website, status, created_at, updated_at
) ON public.provider_profiles TO anon;
GRANT SELECT (
  user_id, company, full_name, description, services, coverage_areas,
  portfolio_urls, pricing_info, logo_url, website, status, created_at, updated_at
) ON public.provider_profiles TO authenticated;

-- Row policy: approved providers are publicly listable
DROP POLICY IF EXISTS "Public reads approved providers" ON public.provider_profiles;
CREATE POLICY "Public reads approved providers"
ON public.provider_profiles FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE VIEW public.public_provider_profiles
WITH (security_invoker = on) AS
SELECT
  user_id, company, full_name, description, services, coverage_areas,
  portfolio_urls, pricing_info, logo_url, website, created_at, updated_at
FROM public.provider_profiles
WHERE status = 'approved';

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;