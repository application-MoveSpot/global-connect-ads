-- Table pour stocker les assets créatifs générés par IA (visuels, jingles, vidéos)
CREATE TABLE IF NOT EXISTS creative_assets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   UUID        NOT NULL,
  brief_id        UUID        REFERENCES advertiser_briefs(id) ON DELETE SET NULL,
  type            TEXT        NOT NULL CHECK (type IN ('image', 'jingle', 'video')),
  provider        TEXT        NOT NULL,               -- 'flux1', 'elevenlabs', 'runway'
  url             TEXT        NOT NULL,               -- URL publique Supabase Storage
  storage_path    TEXT,                               -- Chemin interne Storage
  prompt          TEXT,
  ad_format       TEXT,
  vehicle_types   TEXT[]      NOT NULL DEFAULT '{}',
  cost_cents      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advertisers_select_own_creative_assets"
  ON creative_assets FOR SELECT
  USING (advertiser_id = auth.uid());

CREATE POLICY "advertisers_insert_own_creative_assets"
  ON creative_assets FOR INSERT
  WITH CHECK (advertiser_id = auth.uid());

CREATE INDEX creative_assets_advertiser_id_idx ON creative_assets (advertiser_id);
CREATE INDEX creative_assets_brief_id_idx      ON creative_assets (brief_id);
