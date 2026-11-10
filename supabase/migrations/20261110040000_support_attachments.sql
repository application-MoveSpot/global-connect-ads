-- Pièces jointes dans le chat support

-- 1. Mise à jour de la table des messages de support
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS attachment_url   TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type  TEXT; -- 'image/jpeg', 'application/pdf', etc.

-- 2. Création du bucket de stockage 'support-attachments'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,      -- Bucket privé pour des raisons de confidentialité
  10485760,   -- 10 Mo par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Politiques RLS sur le Storage

-- Annonceurs : upload dans leur propre salon {room_id}/fichier
CREATE POLICY "Annonceurs peuvent uploader dans leur salon"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_rooms r
      WHERE r.id = (storage.foldername(name))[1]::uuid  -- r.id (PK), pas r.room_id
        AND r.advertiser_id = auth.uid()
    )
  );

-- Annonceurs et admins : lecture des pièces jointes
CREATE POLICY "Lecture des pièces jointes autorisée pour les membres"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM public.support_rooms r
        WHERE r.id = (storage.foldername(name))[1]::uuid
          AND r.advertiser_id = auth.uid()
      )
      OR public.is_admin()
    )
  );

-- Annonceurs : suppression de leurs propres fichiers
CREATE POLICY "Annonceurs peuvent supprimer leurs pièces jointes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_rooms r
      WHERE r.id = (storage.foldername(name))[1]::uuid
        AND r.advertiser_id = auth.uid()
    )
  );

-- Admins : suppression de tous les fichiers
CREATE POLICY "Admins peuvent supprimer toutes les pièces jointes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND public.is_admin()
  );
