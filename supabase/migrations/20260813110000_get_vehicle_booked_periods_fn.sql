
-- Public RPC: returns only start_date/end_date of approved campaigns for a vehicle.
-- SECURITY DEFINER bypasses RLS so anyone can call it without exposing other sensitive
-- columns (email, price, message, zone) from campaign_requests.
CREATE OR REPLACE FUNCTION public.get_vehicle_booked_periods(p_vehicle_id UUID)
RETURNS TABLE(start_date DATE, end_date DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
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

-- Revoke default, then grant only to anon + authenticated (called from browser)
REVOKE ALL ON FUNCTION public.get_vehicle_booked_periods(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_booked_periods(UUID) TO anon, authenticated;
