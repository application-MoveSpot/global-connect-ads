-- ─────────────────────────────────────────────────────────────────────────────
-- PR #366 — GPS : colonnes de dernière position sur vehicles
-- ─────────────────────────────────────────────────────────────────────────────

-- Colonnes de cache pour la dernière position GPS connue du véhicule.
-- Mises à jour par l'Edge Function ingest-gps-coordinates à chaque point reçu.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS last_position_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_lng          DOUBLE PRECISION;

-- Index partiel : retrouver rapidement les véhicules actifs récemment
CREATE INDEX IF NOT EXISTS vehicles_last_position_at_idx
  ON vehicles (last_position_at DESC NULLS LAST)
  WHERE last_position_at IS NOT NULL;

-- Index composite sur vehicle_positions pour requêtes par campagne + date
-- (table déjà créée dans migration antérieure ; on ajoute l'index manquant)
CREATE INDEX IF NOT EXISTS vp_campaign_recorded_idx
  ON vehicle_positions (campaign_request_id, recorded_at DESC)
  WHERE campaign_request_id IS NOT NULL;
