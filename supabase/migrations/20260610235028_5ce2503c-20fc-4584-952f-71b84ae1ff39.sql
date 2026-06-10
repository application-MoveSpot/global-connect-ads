GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;
GRANT SELECT ON public.provider_profiles TO anon;

DROP POLICY IF EXISTS "Public reads approved providers" ON public.provider_profiles;
CREATE POLICY "Public reads approved providers"
ON public.provider_profiles
FOR SELECT
TO anon
USING (status = 'approved');