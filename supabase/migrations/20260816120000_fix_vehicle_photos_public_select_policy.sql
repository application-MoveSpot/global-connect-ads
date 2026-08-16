-- =========================================================
-- Corrige l'avertissement de sécurité Supabase :
-- "Public Bucket autorise la publication"
--
-- La migration 20260531201226 avait créé la politique
-- "Vehicle photos are publicly accessible" (SELECT sans filtre)
-- qui permet à n'importe qui de lister tous les fichiers du
-- bucket via l'API storage. Cette politique n'est PAS nécessaire
-- pour que les URL publiques CDN fonctionnent dans un bucket
-- public — Supabase CDN bypasse RLS pour les buckets publics.
--
-- Solution :
-- 1. Supprimer la politique SELECT large héritée.
-- 2. Remettre le bucket en public pour que les URL publiques
--    restent fonctionnelles sur la marketplace (les visiteurs
--    anonymes voient les photos des véhicules via CDN).
-- 3. La politique SELECT authentifiée de 20260814110000 reste
--    en place pour les requêtes API.
-- =========================================================

-- Supprimer l'ancienne politique SELECT générale (la faille signalée)
DROP POLICY IF EXISTS "Vehicle photos are publicly accessible" ON storage.objects;

-- Remettre le bucket en public : les URL CDN doivent fonctionner
-- pour les visiteurs anonymes sur la marketplace publique.
-- La restriction de listage via API est assurée par l'absence
-- de politique SELECT pour anon sur storage.objects.
UPDATE storage.buckets
SET    public = true
WHERE  id = 'vehicle-photos';
