-- Jusqu'ici les poseurs certifiés ne pouvaient pas accéder aux visuels publicitaires
-- (creative_files) des campagnes qu'ils doivent équiper : listInstallationJobs ne les
-- exposait pas et aucune policy de stockage ne les y autorisait. Sans ce visuel, le
-- poseur ne peut pas savoir quoi imprimer/coller sur le véhicule.
CREATE POLICY "Certified installers read creatives for their eligible jobs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-creatives'
  AND EXISTS (
    SELECT 1
    FROM public.campaign_requests cr
    JOIN public.payee_profiles pp ON pp.user_id = auth.uid()
    WHERE cr.status = 'approved'
      AND cr.installation_status <> 'approved'
      AND pp.kind IN ('installer', 'both')
      AND pp.certification_status = 'certified'
      AND storage.objects.name = ANY (cr.creative_files)
  )
);
