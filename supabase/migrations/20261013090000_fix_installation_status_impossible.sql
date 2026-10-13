-- Fix: élargir le CHECK constraint sur installation_status pour autoriser 'impossible'
-- La contrainte d'origine (20260810215556) n'incluait pas 'impossible',
-- ce qui empêchait les prestataires de soumettre un rapport "pose impossible".

ALTER TABLE public.campaign_requests
  DROP CONSTRAINT IF EXISTS campaign_requests_installation_status_check;

ALTER TABLE public.campaign_requests
  ADD CONSTRAINT campaign_requests_installation_status_check
    CHECK (installation_status IN ('pending_approval', 'approved', 'rejected', 'impossible'));
