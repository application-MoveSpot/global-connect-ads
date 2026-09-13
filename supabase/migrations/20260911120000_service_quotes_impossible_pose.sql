-- Impossible pose workflow: add columns and storage bucket
ALTER TABLE service_quotes
  ADD COLUMN IF NOT EXISTS impossible_reason text,
  ADD COLUMN IF NOT EXISTS impossible_photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS impossible_at timestamptz;

-- Storage bucket for impossible pose proof photos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('pose-impossible', 'pose-impossible', false)
  ON CONFLICT (id) DO NOTHING;

-- Prestataire can upload to their own folder
CREATE POLICY "prestataire_upload_impossible" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pose-impossible'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Prestataire can read their own uploads
CREATE POLICY "prestataire_read_impossible" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pose-impossible'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all impossible pose photos
CREATE POLICY "admin_read_impossible" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pose-impossible'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
