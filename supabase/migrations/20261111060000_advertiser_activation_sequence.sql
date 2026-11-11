-- =============================================================================
-- Migration : Séquence d'activation annonceur J+1 / J+3 / J+7
--
-- 1. Table user_notifications pour les notifications in-app serveur
-- 2. Colonnes de suivi sur advertiser_profiles (activation_j1_sent_at,
--    activation_j7_sent_at) pour idempotence stricte côté DB
-- 3. Fonction SQL wrapper + cron quotidien tracé dans admin_cron_logs
-- =============================================================================

-- ── 1. Table user_notifications ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         TEXT        NOT NULL DEFAULT 'generic',
  title        TEXT        NOT NULL,
  body         TEXT,
  href         TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_undismissed
  ON public.user_notifications (user_id)
  WHERE dismissed_at IS NULL;

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Colonnes de suivi sur advertiser_profiles ─────────────────────────────
-- Stocke l'horodatage précis de l'envoi pour audit et idempotence complémentaire.
-- La clé d'idempotence dans email_send_log reste la barrière principale.
ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS activation_j1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_j7_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_activation_j1
  ON public.advertiser_profiles (created_at)
  WHERE activation_j1_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_activation_j7
  ON public.advertiser_profiles (created_at)
  WHERE activation_j7_sent_at IS NULL;

-- ── 3. Wrapper SQL → Edge Function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_advertiser_activation_followup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_edge_url TEXT;
  v_secret   TEXT;
BEGIN
  SELECT decrypted_secret INTO v_edge_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'INTERNAL_FUNCTION_SECRET'
  LIMIT 1;

  IF v_edge_url IS NULL OR v_secret IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'vault secrets missing (SUPABASE_URL or INTERNAL_FUNCTION_SECRET)'
    );
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url || '/functions/v1/send-welcome-sequence',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'x-internal-secret', v_secret
    ),
    body    := '{"emailType":"batch-activation"}'::jsonb
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 4. Cron quotidien 09:37 UTC (heure hors pic, minute non ronde) ───────────
SELECT cron.unschedule('advertiser-activation-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'advertiser-activation-daily'
);

SELECT cron.schedule(
  'advertiser-activation-daily',
  '37 9 * * *',
  $$
    INSERT INTO public.admin_cron_logs (job_name, result)
    SELECT 'advertiser-activation-daily',
           public.run_advertiser_activation_followup();
  $$
);
