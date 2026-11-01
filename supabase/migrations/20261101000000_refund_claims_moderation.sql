-- ─────────────────────────────────────────────────────────────────────────────
-- Table : refund_claims_moderation
-- Stocke l'analyse IA de chaque demande de remboursement.
-- Liée 1:1 à refund_requests (une analyse par demande).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_claims_moderation (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id     uuid        NOT NULL UNIQUE
                                    REFERENCES refund_requests(id) ON DELETE CASCADE,
  analyzed_at           timestamptz NOT NULL DEFAULT now(),

  -- Conformité & Éligibilité
  compliance_eligible   boolean     NOT NULL,
  compliance_reason     text        NOT NULL,
  extracted_facts       text[]      NOT NULL DEFAULT '{}',
  policy_violations     text[]      NOT NULL DEFAULT '{}',

  -- Risque & Fraude
  risk_score            text        NOT NULL
                                    CHECK (risk_score IN ('low', 'medium', 'high')),
  risk_score_numeric    integer     NOT NULL
                                    CHECK (risk_score_numeric BETWEEN 0 AND 100),
  risk_signals          text[]      NOT NULL DEFAULT '{}',
  tone_flags            text[]      NOT NULL DEFAULT '{}',

  -- Décision automatique
  decision              text        NOT NULL
                                    CHECK (decision IN (
                                      'auto_approved',
                                      'auto_rejected',
                                      'requires_human_review'
                                    )),
  decision_justification text       NOT NULL,
  suggested_admin_note  text        NOT NULL,

  -- Méta-données
  model_version         text        NOT NULL,
  processing_ms         integer,
  raw_response          jsonb,

  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS rcm_refund_request_id_idx
  ON refund_claims_moderation (refund_request_id);
CREATE INDEX IF NOT EXISTS rcm_decision_idx
  ON refund_claims_moderation (decision);
CREATE INDEX IF NOT EXISTS rcm_risk_score_idx
  ON refund_claims_moderation (risk_score);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE refund_claims_moderation ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout lire
CREATE POLICY "admin_read_moderation" ON refund_claims_moderation
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Le service role peut tout faire (pour l'Edge Function)
-- (le service role bypasse RLS par défaut)

-- ── Trigger async : déclenche l'analyse IA après chaque INSERT ───────────────

CREATE OR REPLACE FUNCTION fn_analyze_refund_async()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key text;
BEGIN
  -- Lire la clé service depuis le vault (même secret que les autres triggers)
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  -- Si la clé est absente (env de dev), on ne bloque pas
  IF service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Appel async non-bloquant vers l'Edge Function
  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/ai-refund-analysis',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := jsonb_build_object(
      'refund_request_id', NEW.id
    )::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer l'insertion si pg_net ou le vault est indisponible
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_analyze_refund ON refund_requests;
CREATE TRIGGER trg_analyze_refund
  AFTER INSERT ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_analyze_refund_async();
