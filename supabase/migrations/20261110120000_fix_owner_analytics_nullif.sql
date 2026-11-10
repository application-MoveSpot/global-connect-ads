-- Correctif division par zéro dans la projection de revenus propriétaire
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
    SELECT COUNT(*) INTO v_total_vehicles
    FROM public.vehicles WHERE owner_id = p_owner_id;

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

    -- NULLIF évite la division par zéro si une campagne n'a aucune allocation
    SELECT COALESCE(SUM(
        (c.total_cost * 0.70) / COALESCE(NULLIF(
            (SELECT COUNT(*) FROM public.campaign_allocations WHERE campaign_id = c.id),
        0), 1)
    ), 0.00) INTO v_projected_revenue
    FROM public.campaign_allocations ca
    JOIN public.vehicles  v ON ca.vehicle_id  = v.id
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE v.owner_id  = p_owner_id
      AND c.status    IN ('active', 'pending_allocation')
      AND c.end_date  >= NOW()::DATE;

    v_result := jsonb_build_object(
        'total_vehicles',    v_total_vehicles,
        'active_vehicles',   v_active_vehicles,
        'occupancy_rate',    v_occupancy_rate,
        'total_earned',      v_total_earned,
        'projected_revenue', ROUND(v_projected_revenue, 2)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
