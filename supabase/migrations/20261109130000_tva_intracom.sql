-- Add tva_intracom column to advertiser_profiles for EU reverse charge support
ALTER TABLE advertiser_profiles ADD COLUMN IF NOT EXISTS tva_intracom TEXT;
