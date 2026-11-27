-- Migration : table de suivi des appels LLM Council
-- Utilisée pour le rate-limiting journalier (5 sessions/24h par utilisateur par défaut)

CREATE TABLE IF NOT EXISTS public.llm_council_calls (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  called_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens_estimate  INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS llm_council_calls_user_called_idx
  ON public.llm_council_calls(user_id, called_at DESC);

GRANT SELECT, INSERT ON public.llm_council_calls TO authenticated;
GRANT ALL ON public.llm_council_calls TO service_role;

ALTER TABLE public.llm_council_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "llm_council_calls_self_select" ON public.llm_council_calls
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "llm_council_calls_admin_all" ON public.llm_council_calls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
