-- Atomic wallet balance increment to prevent race conditions on concurrent payouts.
-- Replaces read-modify-write in process-campaign-payout Edge Function.

CREATE OR REPLACE FUNCTION public.increment_owner_wallet(
  p_wallet_id UUID,
  p_delta     NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE public.owner_wallets
  SET    balance_ht = balance_ht + p_delta
  WHERE  id = p_wallet_id
  RETURNING balance_ht INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'owner_wallet % not found', p_wallet_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_owner_wallet(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
