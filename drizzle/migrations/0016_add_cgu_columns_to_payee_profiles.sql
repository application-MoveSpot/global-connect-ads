ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cgu_version text;

COMMENT ON COLUMN public.payee_profiles.cgu_accepted_at IS 'Timestamp when the payee accepted the current CGU version at signup';
COMMENT ON COLUMN public.payee_profiles.cgu_version IS 'CGU version accepted by the payee (e.g. 2026-08-24)';