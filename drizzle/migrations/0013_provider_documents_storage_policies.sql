CREATE POLICY "Providers upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Providers read own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'provider-documents'
    AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Providers delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );