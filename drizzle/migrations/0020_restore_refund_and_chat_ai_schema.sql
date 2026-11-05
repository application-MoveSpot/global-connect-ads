CREATE TABLE public.refund_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
 amount_cents integer, reason text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processed')),
 admin_notes text, stripe_refund_id text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY advertiser_read_own_refunds ON public.refund_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY advertiser_insert_own_refunds ON public.refund_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND admin_notes IS NULL AND stripe_refund_id IS NULL AND (campaign_request_id IS NULL OR EXISTS (SELECT 1 FROM public.campaign_requests c WHERE c.id = campaign_request_id AND c.user_id = auth.uid() AND c.payment_status = 'paid')));
CREATE POLICY admin_read_refund_requests ON public.refund_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_update_refund_requests ON public.refund_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX refund_requests_user_created_idx ON public.refund_requests (user_id, created_at DESC);
CREATE INDEX refund_requests_status_created_idx ON public.refund_requests (status, created_at DESC);

CREATE TABLE public.refund_claims_moderation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), refund_request_id uuid NOT NULL UNIQUE REFERENCES public.refund_requests(id) ON DELETE CASCADE,
 analyzed_at timestamptz NOT NULL DEFAULT now(), compliance_eligible boolean NOT NULL, compliance_reason text NOT NULL,
 extracted_facts text[] NOT NULL DEFAULT '{}', policy_violations text[] NOT NULL DEFAULT '{}',
 risk_score text NOT NULL CHECK (risk_score IN ('low','medium','high')),
 risk_score_numeric integer NOT NULL CHECK (risk_score_numeric BETWEEN 0 AND 100),
 risk_signals text[] NOT NULL DEFAULT '{}', tone_flags text[] NOT NULL DEFAULT '{}',
 decision text NOT NULL CHECK (decision IN ('auto_approved','auto_rejected','requires_human_review')),
 decision_justification text NOT NULL, suggested_admin_note text NOT NULL,
 model_version text NOT NULL, processing_ms integer, raw_response jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refund_claims_moderation TO authenticated;
GRANT ALL ON public.refund_claims_moderation TO service_role;
ALTER TABLE public.refund_claims_moderation ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_moderation ON public.refund_claims_moderation FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX rcm_decision_idx ON public.refund_claims_moderation (decision);
CREATE INDEX rcm_risk_score_idx ON public.refund_claims_moderation (risk_score);

CREATE TABLE public.moderation_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid, conversation_id uuid, sender_id uuid,
 intent text NOT NULL DEFAULT 'normal', severity float8 NOT NULL DEFAULT 0,
 flags text[] NOT NULL DEFAULT '{}', suggested_action text,
 reviewed boolean NOT NULL DEFAULT false, reviewed_by uuid, reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 brief_id uuid REFERENCES public.advertiser_briefs(id) ON DELETE CASCADE, proposal_id uuid
);
GRANT SELECT, UPDATE ON public.moderation_alerts TO authenticated;
GRANT ALL ON public.moderation_alerts TO service_role;
ALTER TABLE public.moderation_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY moderation_alerts_admin_select ON public.moderation_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY moderation_alerts_admin_update ON public.moderation_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ma_message_id_idx ON public.moderation_alerts(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX ma_brief_id_idx ON public.moderation_alerts(brief_id) WHERE brief_id IS NOT NULL;
CREATE INDEX ma_severity_idx ON public.moderation_alerts(severity DESC, created_at DESC) WHERE NOT reviewed;

CREATE TABLE public.ai_translations (
 cache_key text PRIMARY KEY, message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
 target_lang text NOT NULL, translation text NOT NULL, detected_lang text NOT NULL DEFAULT 'other',
 model text NOT NULL DEFAULT 'claude-haiku-5-5', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_translations TO authenticated;
GRANT ALL ON public.ai_translations TO service_role;
ALTER TABLE public.ai_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_translations_select ON public.ai_translations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = ai_translations.message_id));
CREATE INDEX at_message_id_idx ON public.ai_translations(message_id) WHERE message_id IS NOT NULL;

CREATE TABLE public.ai_conversation_summaries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL, user_id uuid NOT NULL,
 summary text NOT NULL, negotiation_status text NOT NULL DEFAULT 'negotiating',
 action_required boolean NOT NULL DEFAULT false, message_count integer NOT NULL DEFAULT 0,
 model text NOT NULL DEFAULT 'claude-haiku-5-5', generated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 UNIQUE(conversation_id, user_id)
);
GRANT SELECT ON public.ai_conversation_summaries TO authenticated;
GRANT ALL ON public.ai_conversation_summaries TO service_role;
ALTER TABLE public.ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY acs_owner_select ON public.ai_conversation_summaries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY acs_admin_select ON public.ai_conversation_summaries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX acs_conv_id_expires_idx ON public.ai_conversation_summaries(conversation_id, expires_at DESC);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS moderation jsonb;
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
COMMENT ON TABLE public.ai_conversation_summaries IS 'Per-user conversation summary cache; privileged writes only.';
COMMENT ON TABLE public.refund_claims_moderation IS 'Refund AI analysis storage. Automatic analysis requires a verified same-backend service; no legacy external trigger is installed.';
NOTIFY pgrst, 'reload schema';