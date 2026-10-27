-- Add target_region to advertiser_profiles and campaign_requests.
-- These columns were created directly on the database; this migration
-- ensures every environment gets them and the schema is tracked in git.

ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS target_region text;

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS target_region text;
