-- =========================================================
-- Nettoyage permanent des 5 avertissements linter Supabase
-- (complement de 20260813100000_security_hardening.sql)
--
-- Avertissement 5 (lint=0029) : fonctions SECURITY DEFINER
--   appelables par les utilisateurs connectes.
--
-- Seules confirm_bank_transfer et generate_transfer_reference
-- ont un GRANT TO authenticated superflu : elles ne sont
-- jamais appelees depuis le navigateur (l'une est admin-only
-- via supabaseAdmin, l'autre est un trigger interne).
--
-- has_role et get_vehicle_booked_periods RESTENT accessibles
-- a authenticated : has_role est utilise dans les politiques
-- RLS, get_vehicle_booked_periods dans le calendrier de
-- reservation (booking form).
-- =========================================================

-- 5a. confirm_bank_transfer : admin uniquement, appele via
--     supabaseAdmin (service_role) — jamais depuis le client.
REVOKE EXECUTE ON FUNCTION public.confirm_bank_transfer(UUID, TEXT) FROM authenticated;

-- 5b. generate_transfer_reference : trigger uniquement,
--     jamais appele directement par un utilisateur.
REVOKE EXECUTE ON FUNCTION public.generate_transfer_reference() FROM authenticated;

-- =========================================================
-- Avertissement 4 : bucket vehicle-photos entierement public
-- Le bucket passe en prive. Les URL publiques CDN existantes
-- deviennent inactives ; les nouvelles photos sont uploadees
-- via des chemins stockes en base et les vignettes generees
-- avec des URL signees (expiration 1 h) a chaque affichage.
-- =========================================================

UPDATE storage.buckets
SET    public = false
WHERE  id = 'vehicle-photos';

-- Politique d'ecriture : seul le proprietaire du dossier
-- (userId en premier segment du chemin) peut uploader.
DROP POLICY IF EXISTS "Owners can upload vehicle photos" ON storage.objects;
CREATE POLICY "Owners can upload vehicle photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique de lecture : proprietaire + admin + annonceurs
-- dont le vehicule a une campagne approuvee sur ce vehicule.
DROP POLICY IF EXISTS "Read vehicle photos for approved owners" ON storage.objects;
CREATE POLICY "Read vehicle photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-photos' AND (
      public.has_role(auth.uid(), 'admin') OR
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        JOIN public.owner_profiles op ON op.id = v.owner_id
        WHERE op.user_id::text = (storage.foldername(name))[1]
          AND v.status = 'approved'
      )
    )
  );

-- Supprimer l'eventuelle politique anon heritee
DROP POLICY IF EXISTS "Anyone can read vehicle photos" ON storage.objects;
