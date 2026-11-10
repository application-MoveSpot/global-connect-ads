CREATE OR REPLACE FUNCTION public.calculate_dynamic_campaign_price(
    p_base_price NUMERIC(10,2),
    p_region_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_zone_mult NUMERIC(3,2) := 1.00;
    v_season_mult NUMERIC(3,2) := 1.00;
    v_occupancy_mult NUMERIC(3,2) := 1.00;

    v_total_vehicles INT;
    v_active_allocations INT;
    v_occupancy_rate NUMERIC(5,2);

    v_final_price NUMERIC(10,2);
BEGIN
    -- 1. Multiplicateur de zone
    SELECT COALESCE(base_multiplier, 1.00) INTO v_zone_mult
    FROM public.pricing_zone_multipliers
    WHERE region_id = p_region_id;

    -- 2. Multiplicateur saisonnier maximal sur la période
    SELECT COALESCE(MAX(multiplier), 1.00) INTO v_season_mult
    FROM public.pricing_seasonal_multipliers
    WHERE (start_date, end_date) OVERLAPS (p_start_date, p_end_date);

    -- 3. Taux d'occupation (yield management)
    SELECT COUNT(*) INTO v_total_vehicles
    FROM public.vehicles WHERE region_id = p_region_id;

    SELECT COUNT(DISTINCT vehicle_id) INTO v_active_allocations
    FROM public.campaign_allocations ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE c.region_id = p_region_id
      AND (c.start_date, c.end_date) OVERLAPS (p_start_date, p_end_date);

    IF v_total_vehicles > 0 THEN
        v_occupancy_rate := (v_active_allocations::NUMERIC / v_total_vehicles::NUMERIC) * 100;

        IF    v_occupancy_rate >= 85.00 THEN v_occupancy_mult := 1.30;
        ELSIF v_occupancy_rate >= 60.00 THEN v_occupancy_mult := 1.15;
        ELSIF v_occupancy_rate  < 25.00 THEN v_occupancy_mult := 0.85;
        END IF;
    END IF;

    -- 4. Prix final arrondi à 2 décimales (compatible Stripe / portefeuille)
    v_final_price := p_base_price * v_zone_mult * v_season_mult * v_occupancy_mult;
    RETURN ROUND(v_final_price, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
