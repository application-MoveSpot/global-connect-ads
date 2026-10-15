-- Fix security: restrict SELECT so users can only read their own entry.
-- The "empty = open to all" logic moves to a SECURITY DEFINER function
-- that can count the full table without exposing other emails.

DROP POLICY IF EXISTS "Authenticated can read beta whitelist" ON beta_whitelist;

CREATE POLICY "Users can read own beta whitelist entry"
  ON beta_whitelist FOR SELECT
  TO authenticated
  USING (email = lower((auth.jwt() ->> 'email')::text));

-- SECURITY DEFINER: bypasses RLS to count the full table, but only
-- returns a boolean so no email is ever exposed.
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
  user_email := lower((auth.jwt() ->> 'email')::text);
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
