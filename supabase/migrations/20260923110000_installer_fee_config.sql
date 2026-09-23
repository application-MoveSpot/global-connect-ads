-- ─────────────────────────────────────────────────────────────────────────────
-- Tarifs poseur : table de configuration admin
-- Permet de régler les forfaits pose/dépose sans redéploiement.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.installer_fee_config (
  id                    serial PRIMARY KEY,
  pose_fee_cents        integer NOT NULL DEFAULT 2000 CHECK (pose_fee_cents >= 0),
  depose_fee_cents      integer NOT NULL DEFAULT 2000 CHECK (depose_fee_cents >= 0),
  notes                 text,
  effective_from        timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installer_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select" ON public.installer_fee_config
  FOR SELECT USING (true);
CREATE POLICY "service_role_all" ON public.installer_fee_config
  USING (true) WITH CHECK (true);

GRANT SELECT ON public.installer_fee_config TO authenticated;
GRANT ALL    ON public.installer_fee_config TO service_role;

-- Valeur initiale : 20 € pose + 20 € dépose
INSERT INTO public.installer_fee_config (pose_fee_cents, depose_fee_cents, notes)
VALUES (2000, 2000, 'Tarif initial Guadeloupe — forfait standard berline/van');

-- Fonction utilitaire : retourne le tarif actif
CREATE OR REPLACE FUNCTION public.get_current_installer_fees()
RETURNS TABLE (pose_fee_cents integer, depose_fee_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pose_fee_cents, depose_fee_cents
  FROM public.installer_fee_config
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_installer_fees() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_installer_fees() TO service_role, authenticated;
