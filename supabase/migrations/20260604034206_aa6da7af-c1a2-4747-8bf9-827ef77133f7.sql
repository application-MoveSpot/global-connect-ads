
ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS siret_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS siret_denomination TEXT;

ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS siret_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS siret_denomination TEXT;
