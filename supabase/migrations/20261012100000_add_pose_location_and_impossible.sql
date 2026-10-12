-- Ajout des champs de localisation de pose et signalement d'impossibilité

-- campaign_requests : type de pose, adresse exacte, et champs "pose impossible"
ALTER TABLE campaign_requests
  ADD COLUMN IF NOT EXISTS pose_location_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS installation_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS installation_impossible_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS installation_impossible_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS installation_impossible_photos TEXT[] NOT NULL DEFAULT '{}';

-- Contrainte sur le type de pose autorisé
ALTER TABLE campaign_requests
  DROP CONSTRAINT IF EXISTS campaign_requests_pose_location_type_check;
ALTER TABLE campaign_requests
  ADD CONSTRAINT campaign_requests_pose_location_type_check
    CHECK (pose_location_type IN ('garage', 'domicile'));

-- provider_profiles : types de pose proposés par le prestataire
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS pose_location_types TEXT[] NOT NULL DEFAULT '{}';
