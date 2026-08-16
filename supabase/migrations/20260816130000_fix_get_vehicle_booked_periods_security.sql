-- =========================================================
-- Correction avertissement Supabase :
-- "Le public peut exécuter la fonction SECURITY DEFINER"
--
-- get_vehicle_booked_periods est appelée depuis la page de
-- réservation publique pour afficher les dates déjà prises.
-- L'accès anon est INTENTIONNEL — seules start_date et end_date
-- des campagnes APPROUVÉES sont exposées (aucune donnée sensible).
--
-- Correction :
-- 1. Accorder à anon les colonnes minimales nécessaires sur
--    campaign_requests (vehicle_id, status, start_date, end_date).
-- 2. Ajouter une politique RLS anon étroite (uniquement les
--    campagnes approuvées, uniquement ces 4 colonnes).
-- 3. Convertir la fonction en SECURITY INVOKER : elle utilise
--    désormais les droits de l'appelant (anon) et respecte RLS,
--    ce qui satisfait le linter sans réduire la fonctionnalité.
-- =========================================================

-- 1. Accès colonne-niveau minimal pour anon
GRANT SELECT (vehicle_id, status, start_date, end_date)
  ON public.campaign_requests TO anon;

-- 2. Politique RLS anon : uniquement campagnes approuvées
DROP POLICY IF EXISTS "Anon can read approved campaign periods" ON public.campaign_requests;
CREATE POLICY "Anon can read approved campaign periods"
  ON public.campaign_requests FOR SELECT
  TO anon
  USING (status = 'approved');

-- 3. Recréer la fonction en SECURITY INVOKER
--    (l'appelant anon voit uniquement les colonnes et lignes
--    autorisées par le GRANT et la politique ci-dessus)
CREATE OR REPLACE FUNCTION public.get_vehicle_booked_periods(p_vehicle_id UUID)
RETURNS TABLE(start_date DATE, end_date DATE)
LANGUAGE sql
SECURITY INVOKER
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

-- Maintenir les grants (SECURITY INVOKER ne change pas qui peut appeler la fonction)
REVOKE ALL ON FUNCTION public.get_vehicle_booked_periods(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_booked_periods(UUID) TO anon, authenticated;
