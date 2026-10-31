-- AI Brief Summaries cache table
-- Stores LLM-generated summaries per brief with a 24h TTL.
CREATE TABLE IF NOT EXISTS ai_brief_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id        UUID NOT NULL REFERENCES advertiser_briefs(id) ON DELETE CASCADE,
  advertiser_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_text    TEXT NOT NULL,
  action_required BOOLEAN NOT NULL DEFAULT false,
  proposal_count  INTEGER NOT NULL DEFAULT 0,
  model           TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  CONSTRAINT ai_brief_summaries_brief_id_key UNIQUE (brief_id)
);

ALTER TABLE ai_brief_summaries ENABLE ROW LEVEL SECURITY;

-- Advertisers can only read their own summaries
CREATE POLICY "ai_brief_summaries_select" ON ai_brief_summaries
  FOR SELECT USING (advertiser_id = auth.uid());

-- Edge Function writes via service_role, no direct insert from client
-- Index for fast lookup by brief_id
CREATE INDEX IF NOT EXISTS ai_brief_summaries_brief_id_idx ON ai_brief_summaries (brief_id);
CREATE INDEX IF NOT EXISTS ai_brief_summaries_advertiser_id_idx ON ai_brief_summaries (advertiser_id);
CREATE INDEX IF NOT EXISTS ai_brief_summaries_expires_at_idx ON ai_brief_summaries (expires_at);
