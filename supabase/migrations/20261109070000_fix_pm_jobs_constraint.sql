-- Fix pm_jobs_job_type_check constraint
-- Migration 20261108020000 recreated the constraint without including
-- 'payout_installer' and 'notify_installer_dispatch', causing silent CHECK
-- violations on every validated mission and every dispatch notification.

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
    'notify_installer_dispatch'
  ));
