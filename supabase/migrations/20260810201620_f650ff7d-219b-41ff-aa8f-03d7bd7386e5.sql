ALTER TABLE public.payee_profiles
  ADD COLUMN IF NOT EXISTS vehicle_kind text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS certification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS certification_notes text,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

CREATE TABLE IF NOT EXISTS public.payee_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  description text,
  status text NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payee_earnings TO authenticated;
GRANT ALL ON public.payee_earnings TO service_role;

ALTER TABLE public.payee_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payees view their own earnings"
  ON public.payee_earnings FOR SELECT TO authenticated
  USING (auth.uid() = payee_user_id);

CREATE POLICY "Admins view all earnings"
  ON public.payee_earnings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payee_earnings_updated_at
  BEFORE UPDATE ON public.payee_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();