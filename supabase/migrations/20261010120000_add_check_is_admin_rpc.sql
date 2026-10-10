-- Expose a callable RPC so the frontend can verify admin status
-- without bypassing RLS. Returns true only for the authenticated caller.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Grant execution to authenticated users (they can only check themselves
-- because auth.uid() is always the caller's own id).
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
