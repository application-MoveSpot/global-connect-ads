-- Robustify check_beta_access: if auth.jwt() email is null (stale/expired JWT
-- after a redeploy or Supabase resume), fall back to auth.users lookup via
-- auth.uid() so whitelisted users are never accidentally sent to the waitlist.

CREATE OR REPLACE FUNCTION public.check_beta_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer;
  user_email  text;
BEGIN
  SELECT count(*) INTO total_count FROM beta_whitelist;
  -- Empty whitelist = app open to everyone
  IF total_count = 0 THEN
    RETURN true;
  END IF;

  -- Primary: email from JWT claim (fast, no extra query)
  user_email := lower((auth.jwt() ->> 'email')::text);

  -- Fallback: JWT email can be null on stale tokens after a redeploy or
  -- Supabase resume. Look up via auth.uid() instead.
  IF (user_email IS NULL OR user_email = '') AND auth.uid() IS NOT NULL THEN
    SELECT lower(email) INTO user_email FROM auth.users WHERE id = auth.uid();
  END IF;

  IF user_email IS NULL OR user_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM beta_whitelist WHERE email = user_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_beta_access() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_beta_access() FROM anon;
