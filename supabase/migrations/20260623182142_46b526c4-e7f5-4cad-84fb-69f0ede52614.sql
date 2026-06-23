
-- =========================================================
-- 1. bank_transfer_requests
-- =========================================================
CREATE TABLE public.bank_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  purpose TEXT NOT NULL CHECK (purpose IN ('wallet_topup', 'campaign_direct')),
  campaign_request_id UUID REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  received_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_btr_user_status ON public.bank_transfer_requests(user_id, status);
CREATE INDEX idx_btr_status_created ON public.bank_transfer_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.bank_transfer_requests TO authenticated;
GRANT ALL ON public.bank_transfer_requests TO service_role;

ALTER TABLE public.bank_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own transfer requests"
  ON public.bank_transfer_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own transfer requests"
  ON public.bank_transfer_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel their own pending requests"
  ON public.bank_transfer_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

CREATE POLICY "Admins manage all transfer requests"
  ON public.bank_transfer_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_btr_updated_at
  BEFORE UPDATE ON public.bank_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. owner_payouts
-- =========================================================
CREATE TABLE public.owner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  campaign_request_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  sepa_batch_id UUID,
  iban_snapshot TEXT,
  bic_snapshot TEXT,
  holder_snapshot TEXT,
  paid_at TIMESTAMPTZ,
  marked_paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_owner ON public.owner_payouts(owner_id, status);
CREATE INDEX idx_payouts_status ON public.owner_payouts(status, created_at DESC);
CREATE INDEX idx_payouts_batch ON public.owner_payouts(sepa_batch_id);

GRANT SELECT ON public.owner_payouts TO authenticated;
GRANT ALL ON public.owner_payouts TO service_role;

ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners see their own payouts"
  ON public.owner_payouts FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all payouts"
  ON public.owner_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.owner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. owner_profiles : bank columns
-- =========================================================
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS account_holder TEXT;

-- =========================================================
-- 4. generate_transfer_reference
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_transfer_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT;
  v_attempts INT := 0;
  v_alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  LOOP
    v_ref := 'MS-' ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      '-' ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      substr(v_alphabet, 1 + (random()*31)::int, 1) ||
      substr(v_alphabet, 1 + (random()*31)::int, 1);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bank_transfer_requests WHERE reference = v_ref);
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique reference';
    END IF;
  END LOOP;
  RETURN v_ref;
END;
$$;

-- =========================================================
-- 5. confirm_bank_transfer (admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.confirm_bank_transfer(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.bank_transfer_requests%ROWTYPE;
  v_tx_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT * INTO v_req FROM public.bank_transfer_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Transfer request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Transfer request is not pending (status: %)', v_req.status;
  END IF;

  UPDATE public.bank_transfer_requests
    SET status = 'received',
        received_at = now(),
        confirmed_by = auth.uid(),
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at = now()
    WHERE id = p_request_id;

  IF v_req.purpose = 'wallet_topup' THEN
    v_tx_id := public.apply_wallet_transaction(
      p_user_id := v_req.user_id,
      p_kind := 'topup',
      p_amount_cents := v_req.amount_cents,
      p_description := 'Recharge par virement bancaire — ' || v_req.reference,
      p_currency := v_req.currency
    );
  ELSIF v_req.purpose = 'campaign_direct' AND v_req.campaign_request_id IS NOT NULL THEN
    UPDATE public.campaign_requests
      SET admin_notes = COALESCE(admin_notes || E'\n', '') || '💶 Paiement reçu par virement — ' || v_req.reference,
          updated_at = now()
      WHERE id = v_req.campaign_request_id;
  END IF;

  RETURN p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_transfer_reference() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer(UUID, TEXT) TO authenticated, service_role;
