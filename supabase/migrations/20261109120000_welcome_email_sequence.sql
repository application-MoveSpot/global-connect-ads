-- Migration: welcome_email_sequence
--
-- Sets up automatic welcome email dispatch via the send-welcome-sequence edge function:
--   1. AFTER INSERT trigger on advertiser_profiles  → welcome email (Parcours A)
--   2. AFTER INSERT trigger on owner_profiles       → welcome email (Parcours B)
--   3. pg_cron daily job at 10:00 UTC               → follow-up emails (Day 3 / Day 2)
--
-- Pre-requisites: pg_net and pg_cron must be enabled (done in migration 20261109100000).
-- The edge function URL and anon key are read from Vault secrets at runtime so no
-- credentials are stored in migration SQL.

-- ── Helper function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.call_welcome_sequence_fn(
  p_user_id  uuid,
  p_role     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_edge_url  text;
  v_anon_key  text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_edge_url
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_URL'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[welcome_sequence] could not read SUPABASE_URL from vault: %', SQLERRM;
    RETURN;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[welcome_sequence] could not read SUPABASE_ANON_KEY from vault: %', SQLERRM;
    RETURN;
  END;

  IF v_edge_url IS NULL OR v_anon_key IS NULL THEN
    RAISE WARNING '[welcome_sequence] vault secrets missing — skipping welcome email for user %', p_user_id;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url || '/functions/v1/send-welcome-sequence',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := jsonb_build_object(
      'emailType', 'welcome',
      'userId',    p_user_id::text,
      'role',      p_role
    )::text
  );
END;
$$;

-- ── Trigger: advertiser_profiles ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_advertiser_profile_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.call_welcome_sequence_fn(NEW.user_id, 'advertiser');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_advertiser_profile_created_welcome ON public.advertiser_profiles;

CREATE TRIGGER on_advertiser_profile_created_welcome
AFTER INSERT ON public.advertiser_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_advertiser_profile_welcome();

-- ── Trigger: owner_profiles ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_owner_profile_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.call_welcome_sequence_fn(NEW.user_id, 'vehicle_owner');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_owner_profile_created_welcome ON public.owner_profiles;

CREATE TRIGGER on_owner_profile_created_welcome
AFTER INSERT ON public.owner_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_owner_profile_welcome();

-- ── pg_cron: daily follow-up batch ───────────────────────────────────────────
-- Fires every day at 10:14 UTC (non-round minute to avoid traffic spikes).
-- Calls the edge function in batch-followup mode to send Day-3 and Day-2 emails.

SELECT cron.unschedule('welcome-sequence-followup')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'welcome-sequence-followup'
);

SELECT cron.schedule(
  'welcome-sequence-followup',
  '14 10 * * *',
  $cron$
  DO $body$
  DECLARE
    v_edge_url text;
    v_anon_key text;
  BEGIN
    SELECT decrypted_secret INTO v_edge_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;

    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;

    IF v_edge_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_edge_url || '/functions/v1/send-welcome-sequence',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body    := '{"emailType":"batch-followup"}'
      );
    END IF;
  END;
  $body$
  $cron$
);
