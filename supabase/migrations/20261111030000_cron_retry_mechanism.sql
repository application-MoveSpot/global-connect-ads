-- =============================================================================
-- Migration : Mécanisme de retry automatique pour les jobs pg_cron échoués
-- Ajoute status / retry_count / max_retries / parent_log_id à admin_cron_logs
-- et planifie un job de relance toutes les 30 minutes.
-- =============================================================================

-- ── 1. Nouvelles colonnes ─────────────────────────────────────────────────────
ALTER TABLE public.admin_cron_logs
  ADD COLUMN IF NOT EXISTS status        TEXT   NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS retry_count   INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries   INT    NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS parent_log_id BIGINT REFERENCES public.admin_cron_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_cron_logs_status
  ON public.admin_cron_logs (status, executed_at DESC);

-- ── 2. Trigger : calcule le statut automatiquement à l'INSERT ─────────────────
CREATE OR REPLACE FUNCTION public.set_cron_log_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.result IS NULL THEN
    NEW.status := 'pending';
  ELSIF (NEW.result->>'success')::boolean = true THEN
    NEW.status := 'success';
  ELSIF NEW.retry_count >= NEW.max_retries THEN
    NEW.status := 'exhausted';
  ELSE
    NEW.status := 'failed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cron_log_status ON public.admin_cron_logs;
CREATE TRIGGER trg_set_cron_log_status
  BEFORE INSERT ON public.admin_cron_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cron_log_status();

-- ── 3. Rétroactivement corriger le statut des lignes existantes ───────────────
UPDATE public.admin_cron_logs
SET status = CASE
  WHEN result IS NULL                              THEN 'pending'
  WHEN (result->>'success')::boolean = false       THEN 'failed'
  ELSE 'success'
END
WHERE status = 'success';

-- ── 4. Fonction de retry ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.retry_failed_cron_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failed   RECORD;
  v_result   JSONB;
  v_retried  INT := 0;
BEGIN
  FOR v_failed IN
    SELECT id, job_name, retry_count, max_retries
    FROM public.admin_cron_logs
    WHERE status = 'failed'
      AND retry_count < max_retries
      AND executed_at > NOW() - INTERVAL '24 hours'
    ORDER BY executed_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Marquer en cours de relance pour éviter le double-traitement
    UPDATE public.admin_cron_logs
    SET status = 'retrying'
    WHERE id = v_failed.id;

    -- Exécuter le job correspondant
    IF v_failed.job_name = 'expire-campaigns-nightly' THEN
      SELECT public.process_expired_campaigns_payouts() INTO v_result;
    ELSE
      -- Type de job inconnu : on remet failed, on ne bloque pas les autres
      UPDATE public.admin_cron_logs SET status = 'failed' WHERE id = v_failed.id;
      CONTINUE;
    END IF;

    -- Insérer le log de la tentative (le trigger calcule le nouveau statut)
    INSERT INTO public.admin_cron_logs (
      job_name, result, retry_count, max_retries, parent_log_id
    ) VALUES (
      v_failed.job_name,
      v_result,
      v_failed.retry_count + 1,
      v_failed.max_retries,
      v_failed.id
    );

    v_retried := v_retried + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'retried', v_retried);
END;
$$;

-- ── 5. Job pg_cron toutes les 30 minutes ─────────────────────────────────────
SELECT cron.unschedule('retry-failed-cron-jobs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-cron-jobs'
);

SELECT cron.schedule(
  'retry-failed-cron-jobs',
  '*/30 * * * *',
  $$ SELECT public.retry_failed_cron_jobs(); $$
);
