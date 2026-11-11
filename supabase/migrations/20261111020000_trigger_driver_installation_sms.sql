-- =============================================================================
-- Migration : Trigger SMS chauffeur nouvelle installation
-- Déclenche send-driver-installation-sms via pg_net à chaque INSERT sur
-- installation_missions (nouvelle mission créée = nouvelle installation assignée)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_driver_installation_sms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Récupérer le secret interne depuis Vault
  SELECT decrypted_secret INTO v_secret
  FROM   vault.decrypted_secrets
  WHERE  name = 'INTERNAL_FUNCTION_SECRET'
  LIMIT  1;

  -- Appeler l'Edge Function de manière asynchrone (fire-and-forget)
  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/send-driver-installation-sms',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'x-internal-secret', COALESCE(v_secret, '')
    ),
    body    := jsonb_build_object(
      'mission_id',           NEW.id,
      'mission_type',         NEW.mission_type,
      'campaign_request_id',  NEW.campaign_request_id,
      'scheduled_date',       NEW.scheduled_date,
      'scheduled_time_slot',  NEW.scheduled_time_slot,
      'location_address',     NEW.location_address,
      'location_city',        NEW.location_city
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger AFTER INSERT sur installation_missions
DROP TRIGGER IF EXISTS trigger_driver_installation_sms ON public.installation_missions;

CREATE TRIGGER trigger_driver_installation_sms
  AFTER INSERT ON public.installation_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_installation_sms();
