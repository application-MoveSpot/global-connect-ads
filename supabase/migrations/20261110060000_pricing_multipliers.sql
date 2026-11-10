-- Coefficients par Zone Géographique
CREATE TABLE IF NOT EXISTS public.pricing_zone_multipliers (
    region_id UUID PRIMARY KEY,
    base_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.pricing_zone_multipliers
    IS 'Coefficients de prix par zone géographique (ex: 1.50 pour Paris Centre)';
COMMENT ON COLUMN public.pricing_zone_multipliers.region_id
    IS 'Référence à la table de régions existante';

-- Coefficients de Saisonnalité / Événements
CREATE TABLE IF NOT EXISTS public.pricing_seasonal_multipliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.pricing_seasonal_multipliers
    IS 'Coefficients saisonniers ou événementiels (ex: 1.25 pour Noël, JO, Été)';

-- RLS
ALTER TABLE public.pricing_zone_multipliers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_seasonal_multipliers ENABLE ROW LEVEL SECURITY;

-- Lecture publique (toute app authentifiée peut lire les tarifs)
CREATE POLICY "pricing_zone_read" ON public.pricing_zone_multipliers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_seasonal_read" ON public.pricing_seasonal_multipliers
    FOR SELECT TO authenticated USING (true);

-- Écriture réservée aux admins (service_role uniquement via Edge Function)
CREATE POLICY "pricing_zone_admin_write" ON public.pricing_zone_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "pricing_seasonal_admin_write" ON public.pricing_seasonal_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
