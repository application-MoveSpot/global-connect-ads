-- From supabase/migrations/20261110060000_pricing_multipliers.sql
-- GRANTs added: Supabase's Data API does not grant public-schema tables by default.
CREATE TABLE IF NOT EXISTS public.pricing_zone_multipliers (
    region_id UUID PRIMARY KEY,
    base_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pricing_seasonal_multipliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.pricing_zone_multipliers
    IS 'Coefficients de prix par zone géographique (ex: 1.50 pour Paris Centre)';
COMMENT ON TABLE public.pricing_seasonal_multipliers
    IS 'Coefficients saisonniers ou événementiels (ex: 1.25 pour Noël, JO, Été)';

GRANT SELECT ON public.pricing_zone_multipliers     TO authenticated;
GRANT ALL    ON public.pricing_zone_multipliers     TO service_role;
GRANT SELECT ON public.pricing_seasonal_multipliers TO authenticated;
GRANT ALL    ON public.pricing_seasonal_multipliers TO service_role;

ALTER TABLE public.pricing_zone_multipliers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_seasonal_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_zone_read" ON public.pricing_zone_multipliers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_seasonal_read" ON public.pricing_seasonal_multipliers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_zone_admin_write" ON public.pricing_zone_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pricing_seasonal_admin_write" ON public.pricing_seasonal_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);