-- Migration: owner_wallets + wallet_transactions
-- Portefeuille propriétaire avec historique des transactions et intégration Stripe Connect.

-- ── 1. Table owner_wallets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_wallets (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_connect_id TEXT,
  balance_ht        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance_ht >= 0),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_wallets_owner_id_idx ON public.owner_wallets(owner_id);

ALTER TABLE public.owner_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_wallets_owner_select" ON public.owner_wallets
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owner_wallets_service_all" ON public.owner_wallets
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. Table wallet_transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id           UUID          NOT NULL REFERENCES public.owner_wallets(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL,
  type                TEXT          NOT NULL
                      CHECK (type IN ('payout', 'earnings', 'penalty')),
  status              TEXT          NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id        UUID,
  description         TEXT,
  stripe_transfer_id  TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx
  ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx
  ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_transactions_owner_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM public.owner_wallets WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "wallet_transactions_service_all" ON public.wallet_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 3. Trigger : sync stripe_connect_id depuis owner_profiles ────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_sync_wallet_stripe_connect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.owner_wallets
  SET stripe_connect_id = NEW.stripe_connect_account_id
  WHERE owner_id = NEW.user_id
    AND (stripe_connect_id IS DISTINCT FROM NEW.stripe_connect_account_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wallet_stripe_connect ON public.owner_profiles;
CREATE TRIGGER trg_sync_wallet_stripe_connect
  AFTER INSERT OR UPDATE OF stripe_connect_account_id ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_sync_wallet_stripe_connect();

-- ── 4. Admin : lecture complète ───────────────────────────────────────────────
CREATE POLICY "owner_wallets_admin_select" ON public.owner_wallets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "wallet_transactions_admin_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── 5. Extend pm_jobs.job_type ────────────────────────────────────────────────
ALTER TABLE public.pm_jobs
  DROP CONSTRAINT IF EXISTS pm_jobs_job_type_check;

ALTER TABLE public.pm_jobs
  ADD CONSTRAINT pm_jobs_job_type_check
  CHECK (job_type = ANY (ARRAY[
    'payment_confirmed'::text,
    'installation_validated'::text,
    'campaign_start'::text,
    'campaign_end'::text,
    'depose_validated'::text,
    'coverage_check'::text,
    'incident_detected'::text,
    'refund_pose_impossible'::text,
    'penalty_owner_fault'::text,
    'campaign_payout_processed'::text
  ]));
