REVOKE INSERT, UPDATE, DELETE ON public.provider_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.provider_profiles FROM public;
GRANT SELECT ON public.provider_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;