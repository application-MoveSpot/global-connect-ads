-- Enregistre la version des CGU acceptée et la date d'acceptation
-- pour chaque profil utilisateur (preuve juridique opposable).

ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS cgu_version  text,
  ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;

ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS cgu_version  text,
  ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;
