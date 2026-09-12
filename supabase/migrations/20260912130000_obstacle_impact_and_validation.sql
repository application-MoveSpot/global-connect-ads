-- Ajout de la gestion des fenêtres d'impact et de la validation admin
-- sur les signalements d'obstacles chauffeur.
--
-- impact_start / impact_end : fenêtre temporelle où les métriques GPS
--   sont neutralisées (points exclus du calcul de couverture de zone).
-- admin_validated           : l'admin a vérifié et accepté le signalement.
-- Quand admin_validated = true ET impact_end IS NOT NULL, la fonction
-- pushPositionBatchWithToken filtre les points dans cette fenêtre avant
-- d'appeler record_campaign_gps_batch.

ALTER TABLE public.obstacle_reports
  ADD COLUMN IF NOT EXISTS impact_start    timestamptz,
  ADD COLUMN IF NOT EXISTS impact_end      timestamptz,
  ADD COLUMN IF NOT EXISTS admin_validated boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes     text;

-- Rétroactivement, impact_start = reported_at pour les anciens enregistrements
UPDATE public.obstacle_reports
SET impact_start = reported_at
WHERE impact_start IS NULL;

-- Index pour la recherche rapide des fenêtres validées lors de l'ingestion GPS
CREATE INDEX IF NOT EXISTS idx_obstacle_reports_vehicle_validated
  ON public.obstacle_reports(vehicle_id, admin_validated, impact_start, impact_end)
  WHERE admin_validated = true AND impact_end IS NOT NULL;
