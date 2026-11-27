-- Migration : colonnes de vérification d'assurance (vehicles + payee_profiles)
-- Appliquée en DB le 2026-11-25 ; ce fichier documente et garantit l'idempotence.

-- Table vehicles — assurance auto conducteur
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS auto_insurance_verified      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_insurance_doc_url       text,
  ADD COLUMN IF NOT EXISTS auto_insurance_expires_at    date,
  ADD COLUMN IF NOT EXISTS auto_insurance_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS auto_insurance_verified_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Table payee_profiles — RC Pro "biens confiés" poseur
ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS rcpro_verified     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rcpro_doc_url      text,
  ADD COLUMN IF NOT EXISTS rcpro_expires_at   date,
  ADD COLUMN IF NOT EXISTS rcpro_verified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS rcpro_verified_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Rafraîchit le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
