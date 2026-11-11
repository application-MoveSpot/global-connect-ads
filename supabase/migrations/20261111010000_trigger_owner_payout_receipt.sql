-- =============================================================================
-- Migration : Trigger email reçu virement propriétaire
-- Déclenche send-owner-payout-receipt via pg_net quand
-- bank_transfer_requests.status passe à 'completed'
-- =============================================================================

-- Fonction de déclenchement
CREATE OR REPLACE FUNCTION public.notify_owner_payout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
  v_email  TEXT;
BEGIN
  -- Seulement quand status passe À 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Récupérer le secret interne depuis Vault
    SELECT decrypted_secret INTO v_secret
    FROM   vault.decrypted_secrets
    WHERE  name = 'INTERNAL_FUNCTION_SECRET'
    LIMIT  1;

    -- Récupérer l'email du propriétaire
    SELECT email INTO v_email
    FROM   auth.users
    WHERE  id = NEW.user_id
    LIMIT  1;

    IF v_email IS NULL THEN
      RAISE WARNING 'notify_owner_payout_completed: email introuvable pour user_id=%', NEW.user_id;
      RETURN NEW;
    END IF;

    -- Appeler l'Edge Function de manière asynchrone
    PERFORM net.http_post(
      url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/send-owner-payout-receipt',
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'x-internal-secret', COALESCE(v_secret, '')
      ),
      body    := jsonb_build_object(
        'request_id',        NEW.id,
        'user_id',           NEW.user_id,
        'email',             v_email,
        'amount_cents',      NEW.amount_cents,
        'currency',          NEW.currency,
        'reference',         NEW.reference,
        'stripe_transfer_id', NEW.stripe_transfer_id,
        'completed_at',      NEW.updated_at
      )
    );

  END IF;
  RETURN NEW;
END;
$$;

-- Trigger AFTER UPDATE sur bank_transfer_requests
DROP TRIGGER IF EXISTS trigger_owner_payout_receipt ON public.bank_transfer_requests;

CREATE TRIGGER trigger_owner_payout_receipt
  AFTER UPDATE ON public.bank_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_payout_completed();
