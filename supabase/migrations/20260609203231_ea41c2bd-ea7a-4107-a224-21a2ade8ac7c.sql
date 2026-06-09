GRANT SELECT ON public.provider_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_quotes TO authenticated;
GRANT ALL ON public.service_quotes TO service_role;