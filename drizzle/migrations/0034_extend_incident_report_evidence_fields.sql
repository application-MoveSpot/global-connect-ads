ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS owner_report_photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installer_id uuid,
  ADD COLUMN IF NOT EXISTS installer_confirmation_photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installer_diagnosis text
    CHECK (installer_diagnosis IN (
      'installation_defect', 'material_defect', 'owner_misuse', 'external_damage'
    )),
  ADD COLUMN IF NOT EXISTS installer_notes text,
  ADD COLUMN IF NOT EXISTS installer_confirmed_at timestamptz;

ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_status_check;
ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_status_check
    CHECK (status IN (
      'open','reported_by_owner','confirmed_by_installer',
      'resolved_reprint','resolved_rejected','in_progress','closed'
    ));

CREATE INDEX IF NOT EXISTS idx_incident_reports_installer_id
  ON public.incident_reports (installer_id) WHERE installer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_reports_status
  ON public.incident_reports (status);