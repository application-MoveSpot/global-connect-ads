ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS installation_photos jsonb,
  ADD COLUMN IF NOT EXISTS installation_status text NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS installation_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS installation_notes text;

ALTER TABLE public.campaign_requests
  ADD CONSTRAINT campaign_requests_installation_status_check
  CHECK (installation_status IN ('pending_approval','approved','rejected'));

CREATE INDEX IF NOT EXISTS campaign_requests_installation_status_idx
  ON public.campaign_requests (installation_status);