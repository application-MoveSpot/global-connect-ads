-- Fix: process-email-queue cron was calling the wrong Supabase project (kbloaebbwgzudtkrvulp).
-- Reschedule pointing to the correct production project (phononlhfyljhhhvlmrm).

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    PERFORM cron.unschedule('process-email-queue');
  END IF;
END;
$outer$;

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
