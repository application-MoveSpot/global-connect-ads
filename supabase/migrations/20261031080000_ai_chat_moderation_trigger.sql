-- ─────────────────────────────────────────────────────────────────────────────
-- AI Chat: moderation trigger, indexes, RLS hardening
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add brief_id / proposal_id traceability to moderation_alerts ─────────────
ALTER TABLE moderation_alerts
  ADD COLUMN IF NOT EXISTS brief_id    UUID REFERENCES advertiser_briefs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS proposal_id UUID;

-- 2. Performance indexes ──────────────────────────────────────────────────────

-- ai_conversation_summaries
CREATE INDEX IF NOT EXISTS acs_conv_id_expires_idx
  ON ai_conversation_summaries (conversation_id, expires_at DESC);

-- ai_translations — fast cache lookup + reverse lookup by message
CREATE INDEX IF NOT EXISTS at_cache_key_idx  ON ai_translations (cache_key);
CREATE INDEX IF NOT EXISTS at_message_id_idx ON ai_translations (message_id) WHERE message_id IS NOT NULL;

-- moderation_alerts — operational queries for admin dashboard
CREATE INDEX IF NOT EXISTS ma_message_id_idx  ON moderation_alerts (message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ma_brief_id_idx    ON moderation_alerts (brief_id)   WHERE brief_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ma_severity_idx    ON moderation_alerts (severity DESC, created_at DESC) WHERE NOT reviewed;

-- 3. RLS policies ─────────────────────────────────────────────────────────────
ALTER TABLE ai_translations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_alerts ENABLE ROW LEVEL SECURITY;

-- ai_translations: any authenticated user can read (translations are non-sensitive)
DROP POLICY IF EXISTS "ai_translations_select" ON ai_translations;
CREATE POLICY "ai_translations_select" ON ai_translations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- moderation_alerts: admins only (service_role bypasses RLS automatically)
DROP POLICY IF EXISTS "moderation_alerts_admin_select" ON moderation_alerts;
CREATE POLICY "moderation_alerts_admin_select" ON moderation_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "moderation_alerts_admin_update" ON moderation_alerts;
CREATE POLICY "moderation_alerts_admin_update" ON moderation_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Async moderation trigger function ───────────────────────────────────────
--    Uses the same vault secret as email-queue for the service-role bearer token.
--    If the secret is missing the INSERT is NOT blocked — moderation is best-effort.
CREATE OR REPLACE FUNCTION fn_moderate_message_async()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  -- Vault secret not configured yet — skip silently, never block the INSERT
  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/ai-moderate-message',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'message_id',  NEW.id,
      'content',     NEW.body,
      'sender_id',   NEW.sender_id,
      'brief_id',    NEW.brief_id,
      'proposal_id', NEW.proposal_id
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

-- 5. Trigger — fires AFTER INSERT so it never delays the write ────────────────
DROP TRIGGER IF EXISTS trg_moderate_message ON messages;
CREATE TRIGGER trg_moderate_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION fn_moderate_message_async();
