ALTER TABLE public.bank_transfer_requests
  ADD COLUMN IF NOT EXISTS campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bank_transfer_requests_campaign_idx
  ON public.bank_transfer_requests (campaign_request_id);