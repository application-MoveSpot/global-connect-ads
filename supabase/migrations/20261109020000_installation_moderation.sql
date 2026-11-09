-- ─────────────────────────────────────────────────────────────────────────────
-- PR #365 — Dashboard de modération des poses
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ajouter validation_submitted_at à installation_missions
--    (utilisé par la Edge Function validate-installation, PR #364)
ALTER TABLE installation_missions
  ADD COLUMN IF NOT EXISTS validation_submitted_at TIMESTAMPTZ;

-- 2. Ajouter rejection_reason (motif de refus admin)
ALTER TABLE installation_missions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Étendre le CHECK status pour inclure action_required
ALTER TABLE installation_missions
  DROP CONSTRAINT IF EXISTS installation_missions_status_check;

ALTER TABLE installation_missions
  ADD CONSTRAINT installation_missions_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'dispatched'::text,
    'assigned'::text,
    'en_route'::text,
    'in_progress'::text,
    'pending_validation'::text,
    'validated'::text,
    'cancelled'::text,
    'failed_technical_impossible'::text,
    'action_required'::text
  ]));

-- 4. Étendre pm_jobs.job_type pour installation_rejected
ALTER TABLE pm_jobs
  DROP CONSTRAINT IF EXISTS pm_jobs_job_type_check;

ALTER TABLE pm_jobs
  ADD CONSTRAINT pm_jobs_job_type_check
  CHECK (job_type = ANY (ARRAY[
    'payment_confirmed'::text,
    'installation_validated'::text,
    'campaign_start'::text,
    'campaign_end'::text,
    'depose_validated'::text,
    'coverage_check'::text,
    'incident_detected'::text,
    'refund_pose_impossible'::text,
    'penalty_owner_fault'::text,
    'installation_rejected'::text,
    'payout_installer'::text
  ]));

-- 5. Table installation_moderation_queue
--    File de modération dédiée aux poses (≠ moderation_alerts qui est pour l'IA chat)
CREATE TABLE IF NOT EXISTS installation_moderation_queue (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id          UUID        NOT NULL REFERENCES installation_missions(id) ON DELETE CASCADE,
  campaign_request_id UUID        NOT NULL REFERENCES campaign_requests(id)    ON DELETE CASCADE,
  submitted_by        UUID        NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  poseur_name         TEXT,
  mission_type        TEXT        CHECK (mission_type IN ('pose', 'depose')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  resolution_note     TEXT,
  resolved_by         UUID        REFERENCES auth.users(id),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id)  -- Une seule entrée de modération par mission
);

CREATE INDEX IF NOT EXISTS imq_status_created_idx
  ON installation_moderation_queue (status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS imq_mission_id_idx
  ON installation_moderation_queue (mission_id);

-- RLS : admins en lecture/écriture totale
ALTER TABLE installation_moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imq_admin_all" ON installation_moderation_queue;
CREATE POLICY "imq_admin_all" ON installation_moderation_queue
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
