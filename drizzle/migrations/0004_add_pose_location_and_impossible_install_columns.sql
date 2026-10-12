ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS pose_location_type text,
  ADD COLUMN IF NOT EXISTS installation_address text,
  ADD COLUMN IF NOT EXISTS installation_impossible_reason text,
  ADD COLUMN IF NOT EXISTS installation_impossible_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installation_impossible_at timestamptz;
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS pose_location_types text[] NOT NULL DEFAULT '{}';