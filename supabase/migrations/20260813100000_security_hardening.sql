-- =========================================================
-- Sécurité : correction des 5 avertissements Lovable
-- =========================================================

-- =========================================================
-- 1. campaign_requests : verrouiller l'accès anon
--    Toutes les policies existantes n'ont pas de clause TO
--    explicite — le scanner Lovable les marque comme exposées.
--    Les politiques retravaillées ci-dessous ont toutes TO
--    authenticated, et on révoque les droits anon sur la table.
-- =========================================================

REVOKE ALL ON TABLE public.campaign_requests FROM anon;

-- INSERT : uniquement l'utilisateur connecté peut insérer sa propre demande
DROP POLICY IF EXISTS "Authenticated users can insert own requests" ON public.campaign_requests;
CREATE POLICY "Authenticated users can insert own requests"
  ON public.campaign_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT admin
DROP POLICY IF EXISTS "Admins can view campaign requests" ON public.campaign_requests;
CREATE POLICY "Admins can view campaign requests"
  ON public.campaign_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SELECT annonceur
DROP POLICY IF EXISTS "Advertisers can view own requests" ON public.campaign_requests;
CREATE POLICY "Advertisers can view own requests"
  ON public.campaign_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- SELECT propriétaire de véhicule
DROP POLICY IF EXISTS "Owners can view requests on their vehicles" ON public.campaign_requests;
CREATE POLICY "Owners can view requests on their vehicles"
  ON public.campaign_requests FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE op.user_id = auth.uid()
    )
  );

-- UPDATE admin
DROP POLICY IF EXISTS "Admins can update campaign requests" ON public.campaign_requests;
CREATE POLICY "Admins can update campaign requests"
  ON public.campaign_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- UPDATE propriétaire de véhicule
DROP POLICY IF EXISTS "Owners can update requests on their vehicles" ON public.campaign_requests;
CREATE POLICY "Owners can update requests on their vehicles"
  ON public.campaign_requests FOR UPDATE TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE op.user_id = auth.uid()
    )
  );

-- Politique restrictive de sécurité : anon ne peut jamais accéder à campaign_requests
-- (belt-and-suspenders en plus du REVOKE TABLE)
DROP POLICY IF EXISTS "Deny anon access to campaign_requests" ON public.campaign_requests;
CREATE POLICY "Deny anon access to campaign_requests"
  ON public.campaign_requests AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);


-- =========================================================
-- 2. campaign_metrics : lockout explicite des écritures
--    authenticated n'a que GRANT SELECT (pas d'INSERT/UPDATE/DELETE),
--    mais on rend l'intention explicite avec un REVOKE et une policy
--    restrictive pour que le scanner ne voit plus d'ambiguïté.
-- =========================================================

REVOKE INSERT, UPDATE, DELETE ON public.campaign_metrics FROM authenticated, anon;

DROP POLICY IF EXISTS "No client writes to campaign_metrics" ON public.campaign_metrics;
CREATE POLICY "No client writes to campaign_metrics"
  ON public.campaign_metrics AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (
    -- lecture autorisée si elle passe l'une des politiques SELECT existantes
    true
  )
  WITH CHECK (false);  -- aucune écriture client autorisée


-- =========================================================
-- 3. provider_profiles : prévenir l'auto-approbation du statut
--    Le WITH CHECK (status = subquery) est vulnérable aux TOCTOU
--    (deux UPDATE concurrents peuvent tous deux passer la vérification
--    et s'auto-approuver). On remplace par un trigger BEFORE UPDATE
--    qui annule atomiquement tout changement de statut effectué par
--    un non-admin, quelle que soit la concurrence.
-- =========================================================

CREATE OR REPLACE FUNCTION public.prevent_provider_status_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le champ status change et que l'appelant n'est ni admin ni service_role,
  -- on restaure silencieusement l'ancienne valeur.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin') OR
      current_setting('role', true) = 'service_role' OR
      session_user = 'postgres'
    ) THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_provider_status_self_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_provider_status_self_change_trg ON public.provider_profiles;
CREATE TRIGGER prevent_provider_status_self_change_trg
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_status_self_change();

-- Simplifier la policy UPDATE : le trigger gère désormais la protection du statut
-- (la sous-requête vulnérable est supprimée)
DROP POLICY IF EXISTS "Providers update own profile" ON public.provider_profiles;
CREATE POLICY "Providers update own profile"
  ON public.provider_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =========================================================
-- 4. vehicle-photos : restreindre la lecture aux véhicules approuvés
--    Le bucket est public (CDN), donc les URLs directes restent
--    accessibles — c'est intentionnel pour l'affichage en marketplace.
--    La policy RLS protège l'accès via l'API Supabase :
--    • Admins : accès total
--    • Propriétaire : ses propres photos toujours lisibles
--    • Public/anon : uniquement les photos d'un propriétaire
--      ayant au moins un véhicule approuvé
-- =========================================================

DROP POLICY IF EXISTS "Anyone can read vehicle photos" ON storage.objects;
CREATE POLICY "Read vehicle photos for approved owners"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vehicle-photos' AND (
      -- Admins voient tout
      public.has_role(auth.uid(), 'admin') OR
      -- Propriétaire voit ses propres photos
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Accès public uniquement si le propriétaire du dossier
      -- possède au moins un véhicule approuvé
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        JOIN public.owner_profiles op ON op.id = v.owner_id
        WHERE op.user_id::text = (storage.foldername(name))[1]
          AND v.status = 'approved'
      )
    )
  );


-- =========================================================
-- 5. SECURITY DEFINER : lockout des fonctions non couvertes
--    handle_new_user() est un trigger et ne devrait pas être
--    appelable directement par les utilisateurs connectés.
-- =========================================================

-- Trigger de création de compte utilisateur — trigger uniquement
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Rappel explicite pour les fonctions créées dans cette migration
REVOKE ALL ON FUNCTION public.prevent_provider_status_self_change() FROM anon, authenticated;
