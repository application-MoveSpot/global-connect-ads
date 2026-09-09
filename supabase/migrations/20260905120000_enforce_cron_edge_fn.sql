-- Redirect the enforce-daily cron job from the TanStack route (blocked by Lovable's
-- internal routing state) to a Supabase Edge Function that runs independently.
-- Edge function: supabase/functions/enforce-cron/index.ts

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enforce-daily') THEN
    PERFORM cron.unschedule('enforce-daily');
  END IF;
END;
$outer$;

SELECT cron.schedule(
  'enforce-daily',
  '0 23 * * *',
  $cron$
  DO $body$
  DECLARE
    v_key TEXT;
  BEGIN
    SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;

    IF v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := 'https://phononlhfyljhhhvlmrm.supabase.co/functions/v1/enforce-cron',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_key,
          'apikey',        v_key
        ),
        body    := '{}'::jsonb
      );
    END IF;
  END;
  $body$;
  $cron$
);
