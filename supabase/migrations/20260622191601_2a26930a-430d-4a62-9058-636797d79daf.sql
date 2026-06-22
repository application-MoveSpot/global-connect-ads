
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at timestamptz;

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS platform_fee_cents bigint,
  ADD COLUMN IF NOT EXISTS owner_amount_cents bigint,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_transferred_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_requests_payment_status ON public.campaign_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_campaign_requests_payout_status ON public.campaign_requests(payout_status);
