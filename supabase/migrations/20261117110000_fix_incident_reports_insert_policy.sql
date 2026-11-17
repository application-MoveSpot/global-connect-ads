-- ─── Fix: incident_reports insert policy ──────────────────────────────────────
--
-- Remplace la politique d'insertion pour :
--   1. Restreindre explicitement au rôle "authenticated" (TO authenticated).
--   2. Supprimer la condition redondante auth.uid() = user_id (gérée par
--      application / trigger) et le cas chauffeur (driver_id).
--   3. N'autoriser l'insertion que si l'utilisateur connecté est propriétaire
--      du véhicule via la jointure owner_profiles.

DROP POLICY IF EXISTS "incident_reports_owner_insert" ON public.incident_reports;

CREATE POLICY "incident_reports_owner_insert"
  ON public.incident_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id
        AND op.user_id = auth.uid()
    )
  );
