-- Traitement de la file d'attente des emails support
--
-- Prérequis (à exécuter une seule fois sur le projet) :
--   1. Dans Supabase Dashboard → Edge Functions → Secrets :
--      SUPPORT_WEBHOOK_SECRET = <une chaîne aléatoire longue>
--   2. Dans SQL Editor :
--      -- Secret chiffré dans Vault (ALTER DATABASE est interdit dans Supabase) :
--      SELECT vault.create_secret('<même valeur>', 'support_webhook_secret');
--      -- URL non-sensible via ALTER ROLE (fonctionne sans superuser) :
--      ALTER ROLE postgres SET app.supabase_url TO 'https://<project-ref>.supabase.co';

-- Active pg_net pour les requêtes HTTP asynchrones depuis SQL
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Active pg_cron pour la planification
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fonction principale : parcourt la file et déclenche les envois
CREATE OR REPLACE FUNCTION public.process_support_email_queue()
RETURNS VOID
LANGUAGE plpgsql           -- ← corrigé : plpgsql (PostgreSQL), pas plsql (Oracle)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r                  RECORD;
  v_advertiser_email TEXT;
  v_unread_count     INT;
  v_supabase_url     TEXT;
  v_webhook_secret   TEXT;
BEGIN
  -- Lire les paramètres configurés une fois en base
  v_supabase_url   := current_setting('app.supabase_url', true);

  -- Secret stocké dans Vault (ALTER DATABASE est interdit sans superuser dans Supabase)
  SELECT decrypted_secret INTO v_webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'support_webhook_secret';

  FOR r IN
    SELECT
      q.room_id,
      sr.last_read_at,
      sr.advertiser_id      -- ← corrigé : sr.id est la PK, pas sr.room_id
    FROM public.support_email_queue q
    JOIN public.support_rooms sr ON q.room_id = sr.id  -- ← corrigé : sr.id (PK)
    WHERE q.status = 'pending'
      AND q.scheduled_at <= now()
  LOOP
    -- 1. Recompter les messages admin non-lus au moment du traitement
    --    (l'annonceur a peut-être lu entre-temps → trigger cancel l'a déjà marqué)
    SELECT COUNT(*) INTO v_unread_count
    FROM public.support_messages
    WHERE room_id    = r.room_id
      AND sender_type = 'admin'
      AND (r.last_read_at IS NULL OR created_at > r.last_read_at);

    -- 2. Si tout a été lu entre-temps, annuler silencieusement
    IF v_unread_count = 0 THEN
      UPDATE public.support_email_queue
      SET status     = 'cancelled',
          updated_at = now()
      WHERE room_id = r.room_id;
      CONTINUE;
    END IF;

    -- 3. Récupérer l'email via auth.users (source fiable, pas une table profiles inexistante)
    SELECT au.email INTO v_advertiser_email
    FROM auth.users au
    WHERE au.id = r.advertiser_id;

    IF v_advertiser_email IS NULL THEN
      CONTINUE;  -- Profil orphelin : skip
    END IF;

    -- 4. Appel asynchrone de l'Edge Function via pg_net
    --    Auth : secret dédié (jamais le service_role_key en clair dans SQL)
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-support-reminder',
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'x-webhook-secret',  v_webhook_secret   -- validé côté Edge Function
      ),
      body    := jsonb_build_object(
        'room_id',      r.room_id,
        'email',        v_advertiser_email,
        'unread_count', v_unread_count
      )
    );

    -- 5. Marquer comme envoyé (pg_net est async : on marque avant la réponse)
    UPDATE public.support_email_queue
    SET status     = 'sent',
        updated_at = now()
    WHERE room_id = r.room_id;
  END LOOP;
END;
$$;

-- Planification toutes les minutes via pg_cron
SELECT cron.schedule(
  'process-support-emails',
  '* * * * *',
  'SELECT public.process_support_email_queue();'
);
