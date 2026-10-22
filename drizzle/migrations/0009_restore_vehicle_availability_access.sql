CREATE OR REPLACE FUNCTION public.get_vehicle_booked_periods(p_vehicle_id uuid)
RETURNS TABLE(start_date date, end_date date)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT cr.start_date, cr.end_date
  FROM public.campaign_requests AS cr
  WHERE cr.vehicle_id = p_vehicle_id
    AND cr.status IN ('approved', 'paid', 'pending', 'completed')
    AND cr.end_date >= CURRENT_DATE
    AND cr.start_date IS NOT NULL
    AND cr.end_date IS NOT NULL
  ORDER BY cr.start_date;
$function$;
REVOKE ALL ON FUNCTION public.get_vehicle_booked_periods(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_booked_periods(uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_vehicle_booked_periods(uuid) IS 'Dates-only availability API: intentionally exposes no campaign identifiers, contact details, messages, or financial fields.';
GRANT SELECT, INSERT, UPDATE ON TABLE public.campaign_requests TO authenticated;
GRANT ALL ON TABLE public.campaign_requests TO service_role;
ALTER TABLE public.campaign_requests ENABLE ROW LEVEL SECURITY;