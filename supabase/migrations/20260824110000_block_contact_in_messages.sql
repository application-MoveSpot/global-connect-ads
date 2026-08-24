-- Bloque les coordonnées personnelles dans les champs message
-- pour prévenir les accords hors-plateforme.
-- Couvre : téléphone FR (06/07/+33), email, lien externe, IBAN.

CREATE OR REPLACE FUNCTION check_no_contact_in_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  _msg text := NEW.message;
BEGIN
  IF _msg IS NULL OR length(trim(_msg)) = 0 THEN
    RETURN NEW;
  END IF;

  IF _msg ~* '0[67][\s.\-]?\d{2}([\s.\-]?\d{2}){3}'
  OR _msg ~* '\+33[\s.\-]?[67][\s.\-]?\d{2}([\s.\-]?\d{2}){3}'
  THEN
    RAISE EXCEPTION 'Numéro de téléphone détecté — les coordonnées personnelles ne sont pas autorisées dans les messages. Les échanges doivent rester sur la plateforme MoveSpot.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _msg ~* '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' THEN
    RAISE EXCEPTION 'Adresse email détectée — les coordonnées personnelles ne sont pas autorisées dans les messages. Les échanges doivent rester sur la plateforme MoveSpot.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _msg ~* 'https?://|www\.|wa\.me/|t\.me/|signal\.me|instagram\.com|facebook\.com|linkedin\.com|telegram\.org' THEN
    RAISE EXCEPTION 'Lien externe détecté — les coordonnées personnelles ne sont pas autorisées dans les messages. Les échanges doivent rester sur la plateforme MoveSpot.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _msg ~* '\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?\d{4}' THEN
    RAISE EXCEPTION 'IBAN détecté — les coordonnées personnelles ne sont pas autorisées dans les messages. Les échanges doivent rester sur la plateforme MoveSpot.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- campaign_requests (messages des annonceurs à la réservation)
DROP TRIGGER IF EXISTS trg_no_contact_campaign_requests ON public.campaign_requests;
CREATE TRIGGER trg_no_contact_campaign_requests
  BEFORE INSERT OR UPDATE OF message ON public.campaign_requests
  FOR EACH ROW EXECUTE FUNCTION check_no_contact_in_message();

-- service_quotes (demandes de devis aux prestataires)
DROP TRIGGER IF EXISTS trg_no_contact_service_quotes ON public.service_quotes;
CREATE TRIGGER trg_no_contact_service_quotes
  BEFORE INSERT OR UPDATE OF message ON public.service_quotes
  FOR EACH ROW EXECUTE FUNCTION check_no_contact_in_message();

-- brief_proposals (propositions des propriétaires sur les briefs)
DROP TRIGGER IF EXISTS trg_no_contact_brief_proposals ON public.brief_proposals;
CREATE TRIGGER trg_no_contact_brief_proposals
  BEFORE INSERT OR UPDATE OF message ON public.brief_proposals
  FOR EACH ROW EXECUTE FUNCTION check_no_contact_in_message();
