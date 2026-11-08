-- Migration: add failed_technical_impossible to installation_missions.status check constraint
-- Required by report-pose-impossible Edge Function (art. 15bis CGU).
-- Also adds refund_pose_impossible to pm_jobs.job_type and user_id column.

ALTER TABLE installation_missions
  DROP CONSTRAINT installation_missions_status_check;

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
    'failed_technical_impossible'::text
  ]));

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
    'refund_pose_impossible'::text
  ]));

ALTER TABLE pm_jobs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
