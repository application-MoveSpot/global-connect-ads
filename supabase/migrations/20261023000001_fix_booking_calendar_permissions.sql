-- =========================================================
-- Fix: booking calendar permission denied for anon
--
-- Root cause:
-- Migration 20260813100000 added a RESTRICTIVE deny policy for
-- anon on campaign_requests (USING(false)).  RESTRICTIVE policies
-- always win over permissive ones, so even a properly-scoped
-- permissive SELECT policy can never override it.
-- The SECURITY DEFINER get_vehicle_booked_periods() function runs
-- as postgres (rolbypassrls=true, relforcerowsecurity=false), so
-- it should bypass RLS in theory — but in Supabase's PostgREST
-- setup the combination of REVOKE + RESTRICTIVE + SECURITY DEFINER
-- is unreliable in practice.
--
-- Fix:
-- 1. Drop the overly-broad RESTRICTIVE deny policy.
-- 2. Grant the four safe columns to anon (column-level SELECT).
-- 3. Add a narrow permissive policy: anon sees approved rows only.
-- 4. Rebuild the function as SECURITY INVOKER so anon's own RLS
--    context is used — no privilege escalation, fully auditable.
-- 5. Explicit EXECUTE grants (idempotent).
-- =========================================================

-- 1. Remove the RESTRICTIVE deny policy that blocks everything for anon.
--    Belt-and-suspenders security is kept via: REVOKE on table columns
--    not listed in step 2, and a permissive policy limited to approved rows.
DROP POLICY IF EXISTS "Deny anon access to campaign_requests" ON public.campaign_requests;

-- 2. Column-level grant: only the four fields needed for the availability calendar.
--    Anon cannot read company, email, message, price, or any other column.
GRANT SELECT (vehicle_id, status, start_date, end_date)
  ON public.campaign_requests TO anon;

-- 3. Permissive RLS policy for anon: approved campaigns only.
--    Combined with column-level grant above, anon can only read
--    vehicle_id/status/start_date/end_date for approved campaigns.
DROP POLICY IF EXISTS "Anon can read approved campaign periods" ON public.campaign_requests;
CREATE POLICY "Anon can read approved campaign periods"
  ON public.campaign_requests
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- 4. Rebuild as SECURITY INVOKER: function runs with caller's (anon) privileges,
--    so RLS is applied naturally — the permissive policy above allows the query.
CREATE OR REPLACE FUNCTION public.get_vehicle_booked_periods(p_vehicle_id UUID)
RETURNS TABLE(start_date DATE, end_date DATE)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT cr.start_date, cr.end_date
  FROM public.campaign_requests cr
  WHERE cr.vehicle_id = p_vehicle_id
    AND cr.status = 'approved'
    AND cr.end_date >= CURRENT_DATE
    AND cr.start_date IS NOT NULL
    AND cr.end_date IS NOT NULL
  ORDER BY cr.start_date;
$$;

-- 5. Explicit EXECUTE grants.
REVOKE ALL ON FUNCTION public.get_vehicle_booked_periods(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_booked_periods(UUID) TO anon, authenticated;
