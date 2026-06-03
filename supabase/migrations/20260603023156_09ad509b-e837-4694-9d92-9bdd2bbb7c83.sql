ALTER TABLE public.campaign_requests
ADD COLUMN IF NOT EXISTS creative_files text[] NOT NULL DEFAULT '{}'::text[];

-- Storage policies on campaign-creatives bucket (bucket created via storage_create_bucket tool)
CREATE POLICY "Advertisers upload own creatives"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-creatives'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Advertisers read own creatives"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-creatives'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Advertisers delete own creatives"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-creatives'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all creatives"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-creatives'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners read creatives on their vehicles"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-creatives'
  AND EXISTS (
    SELECT 1
    FROM public.campaign_requests cr
    JOIN public.vehicles v ON v.id = cr.vehicle_id
    JOIN public.owner_profiles op ON op.id = v.owner_id
    WHERE op.user_id = auth.uid()
      AND storage.objects.name = ANY (cr.creative_files)
  )
);
