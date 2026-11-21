-- =============================================================================
-- Migration : colonnes frais forfaitaires (mise en service, incident vinyle)
-- =============================================================================
-- campaign_requests :
--   setup_fee_cents      → forfait mise en service (59/79/99 € HT) pour < 15 j
--   setup_fee_charged    → guard idempotence : débité exactement une fois
--   incident_charge_cents → montant refacturé au propriétaire après rejet incident
-- vehicles :
--   incident_payment_blocked → propriétaire bloqué (solde insuffisant après incident)
-- =============================================================================

-- ── campaign_requests ────────────────────────────────────────────────────────

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS setup_fee_cents        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_fee_charged      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incident_charge_cents  integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.campaign_requests.setup_fee_cents
  IS 'Forfait mise en service HT (centimes) : 5900/7900/9900 pour < 15 jours ; 0 sinon.';
COMMENT ON COLUMN public.campaign_requests.setup_fee_charged
  IS 'true une fois que le débit du forfait mise en service a été effectué.';
COMMENT ON COLUMN public.campaign_requests.incident_charge_cents
  IS 'Montant refacturé au propriétaire (TTC, centimes) après rejet d''incident vinyle.';

-- ── vehicles ─────────────────────────────────────────────────────────────────

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS incident_payment_blocked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vehicles.incident_payment_blocked
  IS 'true si le propriétaire n''a pas pu couvrir un incident vinyle refacturé.';

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_campaign_requests_setup_fee_charged
  ON public.campaign_requests (setup_fee_charged)
  WHERE setup_fee_cents > 0 AND setup_fee_charged = false;

CREATE INDEX IF NOT EXISTS idx_vehicles_incident_blocked
  ON public.vehicles (incident_payment_blocked)
  WHERE incident_payment_blocked = true;
