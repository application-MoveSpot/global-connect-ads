-- ─────────────────────────────────────────────────────────────────────────────
-- chore(cron): planification mensuelle automatique des rapports de performance
-- ─────────────────────────────────────────────────────────────────────────────
-- La clé d'authentification est lue depuis Supabase Vault au moment de
-- l'exécution — jamais stockée en clair dans cette migration.
-- Pré-requis : stocker INTERNAL_FUNCTION_SECRET dans le vault via
--   SELECT vault.create_secret('<valeur>', 'INTERNAL_FUNCTION_SECRET');
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Supprimer le job existant pour idempotence ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trigger-monthly-campaign-reports') THEN
    PERFORM cron.unschedule('trigger-monthly-campaign-reports');
  END IF;
END $$;

-- ── Planification : 1er du mois à 01h00 UTC ──────────────────────────────────
-- Corps vide {} → mode batch : la fonction liste elle-même toutes les campagnes actives.
SELECT cron.schedule(
  'trigger-monthly-campaign-reports',
  '0 1 1 * *',
  $$
    SELECT net.http_post(
      url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/generate-monthly-report-pdf',
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'x-internal-secret', COALESCE(
          (
            SELECT decrypted_secret
            FROM   vault.decrypted_secrets
            WHERE  name = 'INTERNAL_FUNCTION_SECRET'
            LIMIT  1
          ),
          ''
        )
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);
