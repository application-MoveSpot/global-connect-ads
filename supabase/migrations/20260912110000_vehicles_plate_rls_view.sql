-- Vue sécurisée : masque la plaque d'immatriculation pour les annonceurs
--
-- Règle : license_plate est retourné tel quel UNIQUEMENT si l'appelant est :
--   • le propriétaire du véhicule (owner_profiles)
--   • un prestataire/poseur (provider_profiles) — besoin terrain
--   • le chauffeur assigné au véhicule (drivers)
--   • un admin (admin_profiles)
-- Dans tous les autres cas (annonceurs, public) → NULL.
--
-- Usage : remplacer les SELECT sur "vehicles" par "vehicles_safe"
-- partout où la plaque pourrait être exposée à un annonceur.

-- ----------------------------------------------------------------
-- Fonction helper : l'utilisateur courant peut-il voir la plaque ?
-- SECURITY DEFINER pour bypasser RLS lors de la vérification de rôle.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_see_license_plate(p_vehicle_id uuid, p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Propriétaire du véhicule
    EXISTS (
      SELECT 1 FROM owner_profiles
      WHERE user_id = auth.uid() AND id = p_owner_id
    )
    OR
    -- Prestataire / poseur (tout poseur approuvé voit la plaque de sa mission)
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE user_id = auth.uid()
    )
    OR
    -- Chauffeur assigné à ce véhicule
    EXISTS (
      SELECT 1 FROM drivers
      WHERE user_id = auth.uid() AND vehicle_id = p_vehicle_id
    )
    OR
    -- Admin
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE user_id = auth.uid()
    );
$$;

-- ----------------------------------------------------------------
-- Vue vehicles_safe : toutes les colonnes vehicles, plaque masquée
-- pour les utilisateurs non autorisés.
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.vehicles_safe
WITH (security_invoker = true)       -- RLS de la table vehicles s'applique
AS
SELECT
  v.id,
  v.owner_id,
  v.driver_id,
  v.type,
  v.condition,
  v.name,
  v.description,
  v.format_publicitaire,
  v.surface_m2,
  v.km_per_day,
  v.zones,
  v.price_per_day,
  v.photos,
  v.status,
  v.ai_verification,
  v.admin_notes,
  v.brand,
  v.model,
  v.color,
  -- Plaque masquée pour les non-autorisés (NULL → frontend ne l'affiche pas)
  CASE
    WHEN public.can_see_license_plate(v.id, v.owner_id) THEN v.license_plate
    ELSE NULL
  END AS license_plate,
  v.created_at,
  v.updated_at
FROM public.vehicles v;

-- Commentaire de documentation
COMMENT ON VIEW public.vehicles_safe IS
  'Vue vehicles avec license_plate masquée (NULL) pour les annonceurs et le public. '
  'Utiliser cette vue dans tout contexte où un annonceur pourrait voir la liste des véhicules.';
