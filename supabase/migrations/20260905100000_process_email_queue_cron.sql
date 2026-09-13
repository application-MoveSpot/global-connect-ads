-- pg_cron job: call process-email-queue Edge Function every minute.
-- Prerequisites (one-time setup via SQL Editor in Supabase Dashboard):
--   1. Add RESEND_API_KEY in Edge Functions → Secrets
--   2. Store your service_role key in Vault:
--      SELECT vault.create_secret('<service_role_key>', 'email_queue_service_role_key');
--   Note: the service_role key is in Project Settings → API.

-- Remove existing job if present (idempotent)
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    PERFORM cron.unschedule('process-email-queue');
  END IF;
END;
$outer$;

-- Schedule the processor: runs every minute, calls Edge Function only when queue has messages.
-- Uses $body$ as inner delimiter to avoid conflict with the outer $cron$ delimiter.
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $cron$
  DO $body$
  DECLARE
    v_auth_count   BIGINT := 0;
    v_trans_count  BIGINT := 0;
    v_key          TEXT;
  BEGIN
    BEGIN
      SELECT COUNT(*) INTO v_auth_count  FROM pgmq.q_auth_emails;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
    BEGIN
      SELECT COUNT(*) INTO v_trans_count FROM pgmq.q_transactional_emails;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    IF v_auth_count > 0 OR v_trans_count > 0 THEN
      SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
        LIMIT 1;

      IF v_key IS NOT NULL THEN
        PERFORM net.http_post(
          url     := 'https://phononlhfyljhhhvlmrm.supabase.co/functions/v1/process-email-queue',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_key
          ),
          body    := '{}'::jsonb
        );
      END IF;
    END IF;
  END;
  $body$;
  $cron$
);
