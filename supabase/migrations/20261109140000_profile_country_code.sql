-- Add country_code to advertiser_profiles and owner_profiles
-- Default 'FR' (France) for all existing rows

ALTER TABLE advertiser_profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'FR';

ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'FR';
