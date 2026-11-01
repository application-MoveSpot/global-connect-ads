CREATE TABLE IF NOT EXISTS public.ai_brief_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.advertiser_briefs(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  action_required BOOLEAN NOT NULL DEFAULT false,
  proposal_count INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  CONSTRAINT ai_brief_summaries_brief_id_key UNIQUE (brief_id)
);
GRANT SELECT ON public.ai_brief_summaries TO authenticated;
GRANT ALL ON public.ai_brief_summaries TO service_role;
ALTER TABLE public.ai_brief_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_brief_summaries_select" ON public.ai_brief_summaries FOR SELECT TO authenticated USING (advertiser_id = auth.uid());
CREATE INDEX IF NOT EXISTS ai_brief_summaries_brief_id_idx ON public.ai_brief_summaries (brief_id);
CREATE INDEX IF NOT EXISTS ai_brief_summaries_advertiser_id_idx ON public.ai_brief_summaries (advertiser_id);
CREATE INDEX IF NOT EXISTS ai_brief_summaries_expires_at_idx ON public.ai_brief_summaries (expires_at);