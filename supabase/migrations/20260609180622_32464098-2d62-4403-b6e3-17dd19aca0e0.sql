-- Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_balance_nonneg CHECK (balance_cents >= 0)
);

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins see all wallets" ON public.wallets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('topup','campaign_debit','refund','admin_adjustment')),
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  description text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_refund_id text,
  campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_pi_unique
  ON public.wallet_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins see all wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Refunds tied to campaigns
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  reason text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('wallet_credit','stripe_refund')) DEFAULT 'wallet_credit',
  stripe_refund_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage refunds" ON public.refunds
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER refunds_updated_at BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic helper: apply a wallet transaction and update balance.
-- Used by the webhook (top-up) and by campaign debit/refund flows.
CREATE OR REPLACE FUNCTION public.apply_wallet_transaction(
  p_user_id uuid,
  p_kind text,
  p_amount_cents bigint,
  p_description text DEFAULT NULL,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_stripe_checkout_session_id text DEFAULT NULL,
  p_stripe_refund_id text DEFAULT NULL,
  p_campaign_request_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'eur'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_tx_id uuid;
  v_new_balance bigint;
BEGIN
  -- Idempotency: if a topup with the same PI already exists, return it
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM public.wallet_transactions
      WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
    IF v_tx_id IS NOT NULL THEN RETURN v_tx_id; END IF;
  END IF;

  INSERT INTO public.wallets (user_id, currency)
    VALUES (p_user_id, p_currency)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_wallet_id;

  UPDATE public.wallets
    SET balance_cents = balance_cents + p_amount_cents,
        updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance_cents INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Solde insuffisant (manque %)', -v_new_balance;
  END IF;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, kind, amount_cents, currency, description,
    stripe_payment_intent_id, stripe_checkout_session_id, stripe_refund_id,
    campaign_request_id
  ) VALUES (
    v_wallet_id, p_user_id, p_kind, p_amount_cents, p_currency, p_description,
    p_stripe_payment_intent_id, p_stripe_checkout_session_id, p_stripe_refund_id,
    p_campaign_request_id
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_wallet_transaction(uuid, text, bigint, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_wallet_transaction(uuid, text, bigint, text, text, text, text, uuid, text) TO service_role;