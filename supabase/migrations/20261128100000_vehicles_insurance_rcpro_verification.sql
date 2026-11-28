-- Vérification assurance auto conducteurs (public.vehicles)
-- et RC Pro prestataires (public.payee_profiles)
-- Colonnes déjà présentes en production — migration documentaire idempotente

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS auto_insurance_verified    boolean               NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_insurance_doc_url     text,
  ADD COLUMN IF NOT EXISTS auto_insurance_expires_at  date,
  ADD COLUMN IF NOT EXISTS auto_insurance_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS auto_insurance_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.vehicles.auto_insurance_verified    IS 'Attestation d''assurance auto vérifiée par un admin MoveSpot';
COMMENT ON COLUMN public.vehicles.auto_insurance_doc_url     IS 'URL Storage de l''attestation d''assurance auto';
COMMENT ON COLUMN public.vehicles.auto_insurance_expires_at  IS 'Date d''expiration de l''attestation d''assurance';
COMMENT ON COLUMN public.vehicles.auto_insurance_verified_at IS 'Horodatage de la vérification admin';
COMMENT ON COLUMN public.vehicles.auto_insurance_verified_by IS 'Admin ayant effectué la vérification';

ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS rcpro_verified    boolean               NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rcpro_doc_url     text,
  ADD COLUMN IF NOT EXISTS rcpro_expires_at  date,
  ADD COLUMN IF NOT EXISTS rcpro_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rcpro_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.payee_profiles.rcpro_verified    IS 'Attestation RC Pro « biens confiés » vérifiée par un admin MoveSpot';
COMMENT ON COLUMN public.payee_profiles.rcpro_doc_url     IS 'URL Storage de l''attestation RC Pro';
COMMENT ON COLUMN public.payee_profiles.rcpro_expires_at  IS 'Date d''expiration de l''attestation RC Pro';
COMMENT ON COLUMN public.payee_profiles.rcpro_verified_at IS 'Horodatage de la vérification admin';
COMMENT ON COLUMN public.payee_profiles.rcpro_verified_by IS 'Admin ayant effectué la vérification';
