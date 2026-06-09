
CREATE POLICY "Providers upload own portfolio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Providers read own portfolio" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-portfolio' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Providers delete own portfolio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'provider-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
