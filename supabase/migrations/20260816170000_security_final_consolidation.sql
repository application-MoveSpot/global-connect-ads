-- =========================================================
-- Consolidation finale des avertissements sécurité Supabase
-- =========================================================


-- =========================================================
-- 1. log_status_history — revoke définitif
--
-- Fonction TRIGGER (RETURNS trigger) : le linter Supabase
-- la signale parce que PUBLIC a EXECUTE par défaut à la
-- création. Elle ne peut pas être appelée via /rest/v1/rpc
-- (type de retour trigger non exposé). Les triggers se
-- déclenchent par le moteur DB, indépendamment des droits
-- EXECUTE de l'utilisateur courant.
--
-- REVOKE sur PUBLIC, anon, authenticated est donc sans
-- impact sur le fonctionnement des triggers.
-- =========================================================

REVOKE ALL ON FUNCTION public.log_status_history() FROM PUBLIC, anon, authenticated;


-- =========================================================
-- 2. has_role — rétablir EXECUTE pour authenticated
--
-- La migration 20260816160000 a révoqué EXECUTE sur has_role
-- pour authenticated, ce qui est INCORRECT :
-- has_role est SECURITY DEFINER et est appelée dans les
-- politiques RLS (ex. "admins see all wallets",
-- "Admins can view all advertiser profiles", etc.).
-- En PostgreSQL, les utilisateurs connectés ont besoin du
-- droit EXECUTE sur les fonctions appelées dans les
-- politiques RLS qui s'appliquent à eux.
-- Révoquer authenticated casse l'évaluation de toutes les
-- politiques admin pour les utilisateurs connectés.
--
-- Solution : rétablir EXECUTE pour authenticated.
-- L'avertissement linter est un faux positif volontaire :
-- has_role a déjà une garde interne (vérifie que _user_id
-- = auth.uid() avant toute requête sur user_roles).
-- =========================================================

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;


-- =========================================================
-- 3. get_vehicle_booked_periods — s'assurer SECURITY INVOKER
--
-- La migration 20260816130000 a déjà converti la fonction.
-- On la recrée ici pour garantir l'état final même si une
-- migration précédente avait échoué.
-- =========================================================

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

REVOKE ALL ON FUNCTION public.get_vehicle_booked_periods(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_booked_periods(UUID) TO anon, authenticated;


-- =========================================================
-- 4. vehicle-photos — supprimer toutes les politiques SELECT
--    restantes (idempotent)
-- =========================================================

DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Read vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Read vehicle photos for approved owners" ON storage.objects;

-- Bucket doit rester public pour les URL CDN marketplace
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-photos';
