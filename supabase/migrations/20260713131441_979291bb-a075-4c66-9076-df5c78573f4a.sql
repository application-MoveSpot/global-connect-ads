
-- 1. Drop old bank transfer tables & functions
DROP FUNCTION IF EXISTS public.confirm_bank_transfer(uuid, text);
DROP FUNCTION IF EXISTS public.generate_transfer_reference();
DROP TABLE IF EXISTS public.bank_transfer_requests CASCADE;
DROP TABLE IF EXISTS public.owner_payouts CASCADE;

-- 2. Owner profiles: drop IBAN columns, add Stripe Connect columns
ALTER TABLE public.owner_profiles
  DROP COLUMN IF EXISTS iban,
  DROP COLUMN IF EXISTS bic,
  DROP COLUMN IF EXISTS account_holder,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false;

-- 3. Campaign requests: add Stripe payment tracking columns
ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS owner_transferred_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_requests_stripe_pi
  ON public.campaign_requests(stripe_payment_intent_id);

-- 4. Wallet transactions: add Stripe checkout session tracking (already has payment_intent col)
-- (existing schema already includes stripe_payment_intent_id, stripe_checkout_session_id, stripe_refund_id)

-- 5. Stripe events idempotence table (service_role only)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  payload JSONB NOT NULL
);

GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_service_role_only"
  ON public.stripe_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
