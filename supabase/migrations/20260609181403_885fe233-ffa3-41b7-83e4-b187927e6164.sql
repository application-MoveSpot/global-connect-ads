ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_amount_cents bigint;

ALTER TABLE public.campaign_requests
  DROP CONSTRAINT IF EXISTS campaign_requests_payment_status_check;
ALTER TABLE public.campaign_requests
  ADD CONSTRAINT campaign_requests_payment_status_check
  CHECK (payment_status IN ('unpaid','paid','refunded','partial_refund'));

CREATE INDEX IF NOT EXISTS idx_campaign_requests_payment_status ON public.campaign_requests(payment_status);