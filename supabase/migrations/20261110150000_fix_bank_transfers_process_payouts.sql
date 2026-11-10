-- =============================================================================
-- Migration : fix bank_transfer_requests + process_expired_campaigns_payouts
--             + pg_cron job → Edge Function process-bank-transfers
-- =============================================================================

-- ─── 1. Étendre la contrainte CHECK sur status ───────────────────────────────
-- La contrainte existante n'autorisait que pending/submitted/approved/rejected.
-- On ajoute processing/completed/failed pour le workflow de l'Edge Function.

ALTER TABLE public.bank_transfer_requests
  DROP CONSTRAINT IF EXISTS bank_transfer_requests_status_check;

ALTER TABLE public.bank_transfer_requests
  ADD CONSTRAINT bank_transfer_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'submitted'::text,
    'approved'::text,
    'completed'::text,
    'rejected'::text,
    'failed'::text
  ]));

-- ─── 2. Ajouter stripe_account_id à bank_transfer_requests ──────────────────
-- Stocke le Stripe Connect Account ID (acct_xxx) du propriétaire destinataire.
-- Utilisé par l'Edge Function pour la clé de destination du virement Stripe.

ALTER TABLE public.bank_transfer_requests
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- ─── 3. Corriger process_expired_campaigns_payouts() ────────────────────────
-- Bugs corrigés par rapport à la version précédente :
--   • v.stripe_account_id n'existe pas sur vehicles → jointure sur owner_profiles
--   • owner_id → user_id (colonne réelle)
--   • amount → amount_cents (bigint, conversion × 100)
--   • description → admin_notes (colonne réelle)
--   • reference était absent (NOT NULL constraint)
--   • stripe_account_id maintenant stocké pour l'Edge Function

CREATE OR REPLACE FUNCTION public.process_expired_campaigns_payouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign   RECORD;
    v_allocation RECORD;
    v_owner_count INT;
    v_owner_payout_eur  NUMERIC(12,2);
    v_total_processed   INT := 0;
    v_total_transfers   INT := 0;
BEGIN
    -- Sélectionner et verrouiller les campagnes actives expirées
    FOR v_campaign IN
        SELECT id, total_cost, region_id
        FROM   public.campaigns
        WHERE  status   = 'active'
          AND  end_date < NOW()::DATE
        FOR UPDATE
    LOOP
        -- Nombre de propriétaires uniques sur cette campagne
        SELECT COUNT(DISTINCT v.owner_id) INTO v_owner_count
        FROM   public.campaign_allocations ca
        JOIN   public.vehicles            v  ON v.id = ca.vehicle_id
        WHERE  ca.campaign_id = v_campaign.id;

        IF v_owner_count > 0 THEN
            -- Part de 70% divisée équitablement par propriétaire (en euros)
            v_owner_payout_eur := ROUND(
                (v_campaign.total_cost * 0.70) / NULLIF(v_owner_count, 0),
                2
            );

            -- Générer un virement par propriétaire ayant un compte Stripe Connect
            FOR v_allocation IN
                SELECT DISTINCT
                    v.owner_id,
                    op.stripe_connect_account_id  AS stripe_account_id
                FROM   public.campaign_allocations ca
                JOIN   public.vehicles             v  ON v.id = ca.vehicle_id
                JOIN   public.owner_profiles       op ON op.user_id = v.owner_id
                WHERE  ca.campaign_id               = v_campaign.id
                  AND  op.stripe_connect_account_id IS NOT NULL
                  AND  COALESCE(op.stripe_payouts_enabled, false) = true
            LOOP
                INSERT INTO public.bank_transfer_requests (
                    user_id,
                    amount_cents,
                    currency,
                    reference,
                    status,
                    admin_notes,
                    stripe_account_id,
                    created_at,
                    updated_at
                ) VALUES (
                    v_allocation.owner_id,
                    ROUND(v_owner_payout_eur * 100)::bigint,
                    'eur',
                    'transfer_req_' || gen_random_uuid(),
                    'pending',
                    'Rémunération MoveSpot — Clôture de la campagne #' || v_campaign.id,
                    v_allocation.stripe_account_id,
                    NOW(),
                    NOW()
                );

                v_total_transfers := v_total_transfers + 1;
            END LOOP;
        END IF;

        -- Clôturer la campagne
        UPDATE public.campaigns
        SET    status     = 'completed',
               updated_at = NOW()
        WHERE  id = v_campaign.id;

        v_total_processed := v_total_processed + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success',                   true,
        'processed_campaigns_count', v_total_processed,
        'generated_transfers_count', v_total_transfers
    );
END;
$$;

-- ─── 4. Activer pg_net (si pas déjà fait) ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 5. Fonction SQL de déclenchement (évite le DO $$ imbriqué) ─────────────
-- Appelée depuis pg_cron. Lit INTERNAL_FUNCTION_SECRET depuis Vault,
-- déclenche l'Edge Function via pg_net, puis log le déclenchement.
--
-- Setup one-time requis (Supabase Dashboard > Database > Vault) :
--   INSERT INTO vault.secrets (name, secret) VALUES ('INTERNAL_FUNCTION_SECRET', '<random>');
-- Et côté secrets Edge Functions :
--   supabase secrets set INTERNAL_FUNCTION_SECRET=<same-value>
--   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx

CREATE OR REPLACE FUNCTION public.trigger_bank_transfers_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
    v_secret TEXT;
BEGIN
    -- Récupérer le secret partagé depuis Vault
    SELECT decrypted_secret INTO v_secret
    FROM   vault.decrypted_secrets
    WHERE  name = 'INTERNAL_FUNCTION_SECRET'
    LIMIT  1;

    -- Déclencher l'Edge Function de manière asynchrone via pg_net
    PERFORM net.http_post(
        url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/process-bank-transfers',
        headers := jsonb_build_object(
            'Content-Type',      'application/json',
            'x-internal-secret', COALESCE(v_secret, '')
        ),
        body    := '{}'::jsonb
    );

    -- Log du déclenchement (le résultat réel est loggé par l'Edge Function elle-même)
    INSERT INTO public.admin_cron_logs (job_name, result)
    VALUES (
        'process-bank-transfers-triggered',
        jsonb_build_object('status', 'http_post_sent', 'triggered_at', NOW())
    );
END;
$fn$;

-- ─── 6. Supprimer l'ancien job s'il existe ──────────────────────────────────
DO $unschedule$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-bank-transfers-nightly') THEN
        PERFORM cron.unschedule('process-bank-transfers-nightly');
    END IF;
END;
$unschedule$;

-- ─── 7. Scheduler le job à 2h15 UTC (15 minutes après process_expired_campaigns_payouts) ──
SELECT cron.schedule(
    'process-bank-transfers-nightly',
    '15 2 * * *',
    $$SELECT public.trigger_bank_transfers_processing();$$
);

-- ─── 8. Droits RLS : admin_cron_logs (déjà existants, rappel) ───────────────
-- La politique SELECT sur admin_cron_logs est déjà créée dans la migration
-- 20261110140000_pg_cron_expired_campaigns.sql — rien à ajouter ici.
