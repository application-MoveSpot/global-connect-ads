-- =============================================================================
-- Migration : colonnes supplément déplacement vinyle (CGU Art. 11bis)
-- =============================================================================
-- campaign_requests :
--   travel_supplement_cents   → 3500 si pose_location_type = 'domicile' ; 0 sinon
--   travel_supplement_charged → guard idempotence (déduit exactement une fois)
-- =============================================================================

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS travel_supplement_cents   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_supplement_charged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaign_requests.travel_supplement_cents
  IS 'Supplément déplacement TTC (centimes) déduit des gains propriétaire si pose à domicile (3500 = 35 € TTC).';
COMMENT ON COLUMN public.campaign_requests.travel_supplement_charged
  IS 'true une fois que le supplément déplacement a été déduit de owner_amount_cents.';
