-- From supabase/migrations/20261110090000_get_owner_financial_analytics.sql
-- Hardening added: only the owner of the profile (or an admin) may read these figures.
-- NOTE: inert until the tables it reads exist (see report): campaign_allocations, campaigns.
CREATE OR REPLACE FUNCTION public.get_owner_financial_analytics(p_owner_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_vehicles    INT;
    v_active_vehicles   INT;
    v_occupancy_rate    NUMERIC(5,2)  := 0.00;
    v_total_earned      NUMERIC(10,2) := 0.00;
    v_projected_revenue NUMERIC(10,2) := 0.00;
    v_result            JSONB;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_owner_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'get_owner_financial_analytics : accès réservé au propriétaire du profil ou à un administrateur';
    END IF;

    SELECT COUNT(*) INTO v_total_vehicles
    FROM public.vehicles
    WHERE owner_id = p_owner_id;

    SELECT COUNT(DISTINCT ca.vehicle_id) INTO v_active_vehicles
    FROM public.campaign_allocations ca
    JOIN public.vehicles  v ON ca.vehicle_id  = v.id
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE v.owner_id = p_owner_id
      AND c.status   = 'active'
      AND NOW() BETWEEN c.start_date AND c.end_date;

    IF v_total_vehicles > 0 THEN
        v_occupancy_rate := ROUND(
            (v_active_vehicles::NUMERIC / v_total_vehicles::NUMERIC) * 100, 2
        );
    END IF;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_earned
    FROM public.bank_transfer_requests
    WHERE owner_id = p_owner_id AND status = 'completed';

    -- Part propriétaire : 70 % du coût de campagne réparti par véhicule
    SELECT COALESCE(SUM(
        (c.total_cost * 0.70) / (
            SELECT COUNT(*) FROM public.campaign_allocations WHERE campaign_id = c.id
        )
    ), 0.00) INTO v_projected_revenue
    FROM public.campaign_allocations ca
    JOIN public.vehicles  v ON ca.vehicle_id  = v.id
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE v.owner_id = p_owner_id
      AND c.status   IN ('active', 'pending_allocation')
      AND c.end_date >= NOW()::DATE;

    v_result := jsonb_build_object(
        'total_vehicles',    v_total_vehicles,
        'active_vehicles',   v_active_vehicles,
        'occupancy_rate',    v_occupancy_rate,
        'total_earned',      v_total_earned,
        'projected_revenue', ROUND(v_projected_revenue, 2)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_owner_financial_analytics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_financial_analytics(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.get_owner_financial_analytics(UUID) TO service_role;