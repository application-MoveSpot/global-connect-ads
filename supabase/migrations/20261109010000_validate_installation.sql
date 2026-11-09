-- ─────────────────────────────────────────────────────────────────────────────
-- PR #364 — Validation d'une pose réussie
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend mission_proofs.proof_type to accept 4 installation-validation angles
DO $$
BEGIN
  ALTER TABLE mission_proofs
    DROP CONSTRAINT IF EXISTS mission_proofs_proof_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE mission_proofs
  ADD CONSTRAINT mission_proofs_proof_type_check
  CHECK (proof_type IN (
    'avant', 'pendant', 'apres',
    'face_avant', 'face_arriere', 'profil_gauche', 'profil_droit'
  ));

-- 2. Create storage bucket for installation-validations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installation-validations',
  'installation-validations',
  false,
  10485760,       -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for installation-validations bucket

-- Poseur can upload to their own user-id subfolder
CREATE POLICY "poseur_upload_installation_validations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'installation-validations' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Poseur can read their own uploads
CREATE POLICY "poseur_read_own_installation_validations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'installation-validations' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin can read all uploads (for moderation)
CREATE POLICY "admin_read_installation_validations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'installation-validations' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
