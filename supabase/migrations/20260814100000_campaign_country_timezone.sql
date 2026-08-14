-- Généralisation internationale des règles de pauses conducteur
-- country_code : zone réglementaire (EU/US/CA/AU/DEFAULT)
-- timezone     : fuseau IANA du lieu de diffusion

ALTER TABLE campaign_requests
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'EU',
  ADD COLUMN IF NOT EXISTS timezone     TEXT NOT NULL DEFAULT 'Europe/Paris';

COMMENT ON COLUMN campaign_requests.country_code IS 'Zone réglementaire pauses conducteur : EU (CE 561/2006), US (FMCSA), CA (NSC), AU (NHVL), DEFAULT (OIT)';
COMMENT ON COLUMN campaign_requests.timezone IS 'Fuseau IANA du lieu de diffusion — interprétation des plages horaires daily_start_time / daily_end_time';
