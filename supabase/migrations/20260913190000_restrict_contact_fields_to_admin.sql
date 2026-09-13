-- =========================================================
-- Restriction des champs de contact aux seuls admins MoveSpot
--
-- Seul MoveSpot (admin / service_role) doit pouvoir lire :
--   - adresse entreprise (company, address, siret)
--   - adresse postale (address)
--   - courrier/email (email)
--   - téléphone (phone)
-- d'un utilisateur qui n'est pas lui-même.
-- =========================================================


-- =========================================================
-- 1. owner_profiles — corriger le GRANT anon trop large
--
--    20260906090000 a accordé SELECT sur toute la table à
--    anon, exposant full_name, phone, company…
--    Seules les colonnes user_id et city sont nécessaires
--    pour la carte publique (FleetMap / AdSpots).
-- =========================================================

REVOKE SELECT ON public.owner_profiles FROM anon;

GRANT SELECT (user_id, city) ON public.owner_profiles TO anon;


-- =========================================================
-- 2. provider_profiles — restreindre la lecture croisée
--
--    La politique "Authenticated reads approved providers"
--    (20260816100000) autorisait TOUT utilisateur connecté
--    à lire email, phone, siret d'un prestataire approuvé.
--
--    Remplacement :
--      - les prestataires voient leur propre profil complet
--      - les admins voient tous les profils complets
--      - les autres utilisateurs passent par la vue publique
--        public_provider_profiles qui ne contient ni email,
--        ni phone, ni siret.
-- =========================================================

DROP POLICY IF EXISTS "Authenticated reads approved providers"
  ON public.provider_profiles;

DROP POLICY IF EXISTS "Providers can view own profile"
  ON public.provider_profiles;

CREATE POLICY "Providers can view own profile"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all provider profiles"
  ON public.provider_profiles;

CREATE POLICY "Admins can view all provider profiles"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- =========================================================
-- 3. campaign_requests — masquer l'email de l'annonceur
--    aux propriétaires de véhicules
--
--    La politique "Owners can view requests on their
--    vehicles" permet aux propriétaires de lire les
--    campaign_requests de leurs véhicules. La colonne
--    email (contact annonceur) ne doit pas être visible
--    par les propriétaires — seul l'admin la consulte
--    via service_role (qui bypasse tous les GRANTs).
-- =========================================================

REVOKE SELECT (email) ON public.campaign_requests FROM authenticated;
