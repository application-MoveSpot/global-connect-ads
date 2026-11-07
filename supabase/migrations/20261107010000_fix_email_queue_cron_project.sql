-- Fix: process-email-queue and enforce-daily crons were calling phononlhfyljhhhvlmrm (non-existent/wrong project).
-- The edge functions are deployed on kbloaebbwgzudtkrvulp — fix the URLs.
-- Note: vault secret 'email_queue_service_role_key' must be updated manually with the service_role key of kbloaebbwgzudtkrvulp.

-- Fix process-email-queue cron
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
          url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/process-email-queue',
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

-- Fix enforce-daily cron
DO $outer2$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enforce-daily') THEN
    PERFORM cron.unschedule('enforce-daily');
  END IF;
END;
$outer2$;

SELECT cron.schedule(
  'enforce-daily',
  '0 23 * * *',
  $cron2$
  DO $body2$
  DECLARE
    v_key TEXT;
  BEGIN
    SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;

    IF v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/enforce-cron',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_key,
          'apikey',        v_key
        ),
        body    := '{}'::jsonb
      );
    END IF;
  END;
  $body2$;
  $cron2$
);
