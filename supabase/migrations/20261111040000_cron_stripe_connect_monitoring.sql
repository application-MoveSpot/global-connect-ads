-- =============================================================================
-- Migration : Monitoring hebdomadaire des propriétaires avec onboarding Stripe
-- Connect incomplet. Envoie un email de rappel via la Edge Function
-- send-owner-stripe-reminder à ceux qui ont un véhicule en campagne active
-- mais dont stripe_payouts_enabled = false ou stripe_connect_account_id IS NULL.
-- =============================================================================

-- ── Fonction principale ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_incomplete_stripe_onboarding()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner    RECORD;
  v_secret   TEXT;
  v_notified INT := 0;
  v_errors   INT := 0;
BEGIN
  -- Récupérer le secret interne depuis le vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'INTERNAL_FUNCTION_SECRET'
  LIMIT 1;

  FOR v_owner IN
    SELECT DISTINCT
      op.id        AS owner_id,
      op.full_name,
      u.email
    FROM public.owner_profiles op
    JOIN auth.users u ON u.id = op.user_id
    WHERE (
      op.stripe_payouts_enabled = false
      OR op.stripe_connect_account_id IS NULL
    )
    AND u.email IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM   public.vehicles v
      JOIN   public.campaign_allocations ca ON ca.vehicle_id = v.id
      JOIN   public.campaigns c            ON c.id = ca.campaign_id
      WHERE  v.owner_id = op.id
        AND  c.status IN ('active', 'running')
    )
  LOOP
    BEGIN
      PERFORM net.http_post(
        url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/send-owner-stripe-reminder',
        headers := jsonb_build_object(
          'Content-Type',      'application/json',
          'x-internal-secret', COALESCE(v_secret, '')
        ),
        body    := jsonb_build_object(
          'owner_id',  v_owner.owner_id,
          'email',     v_owner.email,
          'full_name', v_owner.full_name
        )
      );
      v_notified := v_notified + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success',  true,
    'notified', v_notified,
    'errors',   v_errors
  );
END;
$$;

-- ── Job pg_cron hebdomadaire (lundi 8h UTC) ───────────────────────────────────
SELECT cron.unschedule('check-stripe-onboarding-weekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-stripe-onboarding-weekly'
);

SELECT cron.schedule(
  'check-stripe-onboarding-weekly',
  '0 8 * * 1',
  $$
    INSERT INTO public.admin_cron_logs (job_name, result)
    SELECT 'check-stripe-onboarding-weekly',
           public.check_incomplete_stripe_onboarding();
  $$
);
