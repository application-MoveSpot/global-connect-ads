-- Migration: owner_penalties table + fault_cause on installation_missions
-- Implements automatic penalty logic for owner fault in pose-impossible scenarios (art. 11bis CGU).

-- 1. Add fault_cause to installation_missions
ALTER TABLE installation_missions
  ADD COLUMN IF NOT EXISTS fault_cause TEXT
  CHECK (fault_cause IS NULL OR fault_cause = ANY (ARRAY[
    'vehicle_dirty'::text,
    'body_damage'::text,
    'vehicle_absent'::text,
    'other'::text
  ]));

-- 2. Create owner_penalties table
CREATE TABLE IF NOT EXISTS owner_penalties (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_request_id UUID        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  mission_id          UUID        NOT NULL REFERENCES installation_missions(id) ON DELETE CASCADE,
  fault_cause         TEXT        NOT NULL CHECK (fault_cause = ANY (ARRAY[
                                    'vehicle_dirty',
                                    'body_damage',
                                    'vehicle_absent',
                                    'other'
                                  ])),
  amount_eur          NUMERIC(10,2) NOT NULL DEFAULT 30.00,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status = ANY (ARRAY['pending','collected','waived','failed'])),
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS owner_penalties_owner_id_idx ON owner_penalties(owner_id);
CREATE INDEX IF NOT EXISTS owner_penalties_campaign_idx  ON owner_penalties(campaign_request_id);

-- RLS
ALTER TABLE owner_penalties ENABLE ROW LEVEL SECURITY;

-- Owners can see their own penalties
CREATE POLICY "owner_penalties_owner_read" ON owner_penalties
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Service role / edge functions can do everything
CREATE POLICY "owner_penalties_service_all" ON owner_penalties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read all penalties
CREATE POLICY "owner_penalties_admin_read" ON owner_penalties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Add refund_pose_impossible is already there (migration 20261108020000).
--    Add penalty_owner_fault to pm_jobs.job_type CHECK constraint.
ALTER TABLE pm_jobs
  DROP CONSTRAINT pm_jobs_job_type_check;

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
    'penalty_owner_fault'::text
  ]));
