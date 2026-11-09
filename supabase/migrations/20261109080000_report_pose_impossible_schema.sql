-- report_pose_impossible schema support
-- Adds fault_cause to installation_missions, creates owner_penalties table,
-- and extends pm_jobs constraint with penalty_owner_fault job type.

-- 1. Add fault_cause column to installation_missions (idempotent)
DO $$ BEGIN
  ALTER TABLE public.installation_missions
    ADD COLUMN fault_cause TEXT
    CHECK (fault_cause IN ('vehicle_dirty', 'body_damage', 'vehicle_absent', 'other'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Create owner_penalties table
CREATE TABLE IF NOT EXISTS public.owner_penalties (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id        UUID         NOT NULL,
  campaign_request_id  UUID         NOT NULL REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  mission_id           UUID         NOT NULL REFERENCES public.installation_missions(id) ON DELETE CASCADE,
  fault_cause          TEXT         NOT NULL,
  amount_eur           NUMERIC(10,2) NOT NULL DEFAULT 30,
  status               TEXT         NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processed', 'disputed', 'waived')),
  processed_at         TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_penalties_owner    ON public.owner_penalties(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_owner_penalties_campaign ON public.owner_penalties(campaign_request_id);
CREATE INDEX IF NOT EXISTS idx_owner_penalties_status   ON public.owner_penalties(status);

GRANT ALL ON public.owner_penalties TO service_role;

ALTER TABLE public.owner_penalties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages owner_penalties"
    ON public.owner_penalties FOR ALL
    USING  (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read owner_penalties"
    ON public.owner_penalties FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Extend pm_jobs constraint to include penalty_owner_fault
ALTER TABLE public.pm_jobs DROP CONSTRAINT IF EXISTS pm_jobs_job_type_check;

ALTER TABLE public.pm_jobs
  ADD CONSTRAINT pm_jobs_job_type_check
  CHECK (job_type IN (
    'payment_confirmed',
    'installation_validated',
    'campaign_start',
    'campaign_end',
    'depose_validated',
    'coverage_check',
    'incident_detected',
    'refund_pose_impossible',
    'campaign_payout_processed',
    'payout_installer',
    'notify_installer_dispatch',
    'penalty_owner_fault'
  ));
