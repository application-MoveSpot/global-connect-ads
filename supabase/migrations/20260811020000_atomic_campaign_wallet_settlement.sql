-- Règlement atomique d'une campagne depuis le portefeuille : débit du wallet et
-- passage en "payée" dans la même transaction, pour éviter un double débit si
-- l'étape de mise à jour de campaign_requests échoue après le débit (et qu'un
-- nouvel essai est déclenché côté application).
CREATE OR REPLACE FUNCTION public.settle_campaign_from_wallet(
  p_campaign_request_id uuid,
  p_description text DEFAULT NULL
) RETURNS TABLE (
  already_paid boolean,
  amount_cents bigint,
  owner_amount_cents bigint,
  platform_fee_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_price numeric;
  v_payment_status text;
  v_spot_name text;
  v_amount_cents bigint;
  v_owner_amount_cents bigint;
  v_platform_fee_cents bigint;
BEGIN
  SELECT cr.user_id, cr.total_price, cr.payment_status, cr.spot_name
    INTO v_user_id, v_total_price, v_payment_status, v_spot_name
    FROM public.campaign_requests cr
    WHERE cr.id = p_campaign_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne introuvable';
  END IF;

  IF v_payment_status = 'paid' THEN
    RETURN QUERY SELECT true, NULL::bigint, NULL::bigint, NULL::bigint;
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Campagne sans annonceur identifié';
  END IF;

  IF v_total_price IS NULL OR v_total_price <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  v_amount_cents := ROUND(v_total_price * 100);
  v_owner_amount_cents := ROUND(v_amount_cents * 0.7);
  v_platform_fee_cents := v_amount_cents - v_owner_amount_cents;

  -- Débit du portefeuille : si l'UPDATE ci-dessous échoue, cette écriture est
  -- annulée avec le reste de la transaction (rollback complet, pas de double débit).
  PERFORM public.apply_wallet_transaction(
    v_user_id,
    'campaign_debit',
    -v_amount_cents,
    COALESCE(p_description, 'Paiement campagne — ' || v_spot_name),
    NULL,
    NULL,
    NULL,
    p_campaign_request_id,
    'eur'
  );

  UPDATE public.campaign_requests
    SET payment_status = 'paid',
        paid_at = now(),
        paid_amount_cents = v_amount_cents,
        owner_amount_cents = v_owner_amount_cents,
        platform_fee_cents = v_platform_fee_cents,
        payout_status = 'pending'
    WHERE id = p_campaign_request_id;

  RETURN QUERY SELECT false, v_amount_cents, v_owner_amount_cents, v_platform_fee_cents;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_campaign_from_wallet(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_campaign_from_wallet(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_campaign_from_wallet(uuid, text) TO service_role;
