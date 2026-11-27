-- Migration : champs de consentement RGPD pour tous les profils utilisateur
-- Items 1, 2, 3 — acceptation CGU/confidentialité horodatée + consentement marketing optionnel

ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version        text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version      text,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version        text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version      text,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version        text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version      text,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version        text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version      text,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

NOTIFY pgrst, 'reload schema';
