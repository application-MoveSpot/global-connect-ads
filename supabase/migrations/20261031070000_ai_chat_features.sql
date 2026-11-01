-- ─────────────────────────────────────────────────────────────────────────────
-- AI Chat features: moderation_alerts, ai_translations, ai_conversation_summaries
-- Must run BEFORE ai_chat_moderation_trigger (indexes + RLS policies reference
-- these tables).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. moderation_alerts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_alerts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       uuid,
  conversation_id  uuid,
  sender_id        uuid,
  intent           text        NOT NULL DEFAULT 'normal',
  severity         float8      NOT NULL DEFAULT 0.0,
  flags            text[]      NOT NULL DEFAULT '{}',
  suggested_action text,
  reviewed         boolean     NOT NULL DEFAULT false,
  reviewed_by      uuid,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. ai_translations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_translations (
  cache_key     text        PRIMARY KEY,
  message_id    uuid,
  target_lang   text        NOT NULL,
  translation   text        NOT NULL,
  detected_lang text        NOT NULL DEFAULT 'other',
  model         text        NOT NULL DEFAULT 'claude-haiku-5-5',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. ai_conversation_summaries ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid        NOT NULL UNIQUE,
  user_id             uuid        NOT NULL,
  summary             text        NOT NULL,
  negotiation_status  text        NOT NULL DEFAULT 'negotiating',
  action_required     boolean     NOT NULL DEFAULT false,
  message_count       integer     NOT NULL DEFAULT 0,
  model               text        NOT NULL DEFAULT 'claude-haiku-5-5',
  generated_at        timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL
);

-- RLS for ai_conversation_summaries (ai_translations + moderation_alerts are
-- handled by the subsequent ai_chat_moderation_trigger migration)
ALTER TABLE ai_conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acs_admin_select" ON ai_conversation_summaries;
CREATE POLICY "acs_admin_select" ON ai_conversation_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "acs_owner_select" ON ai_conversation_summaries;
CREATE POLICY "acs_owner_select" ON ai_conversation_summaries
  FOR SELECT USING (user_id = auth.uid());
