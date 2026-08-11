CREATE OR REPLACE FUNCTION public.settle_campaign_from_wallet(
  p_campaign_request_id uuid,
  p_description text DEFAULT NULL
)
RETURNS TABLE (already_paid boolean, amount_cents bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.campaign_requests;
  v_amount bigint;
  v_owner_amount bigint;
  v_fee bigint;
  v_owner uuid;
BEGIN
  SELECT * INTO v_campaign
  FROM public.campaign_requests
  WHERE id = p_campaign_request_id
  FOR UPDATE;

  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campagne introuvable';
  END IF;

  IF v_campaign.payment_status = 'paid' THEN
    RETURN QUERY SELECT true, COALESCE(v_campaign.paid_amount_cents, 0)::bigint;
    RETURN;
  END IF;

  IF v_campaign.user_id IS NULL THEN
    RAISE EXCEPTION 'Campagne sans annonceur identifié';
  END IF;

  v_amount := ROUND(COALESCE(v_campaign.total_price, 0) * 100)::bigint;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  v_owner_amount := FLOOR(v_amount * 0.70)::bigint;
  v_fee := v_amount - v_owner_amount;

  -- Débit du portefeuille annonceur (échoue si solde insuffisant)
  PERFORM public.apply_wallet_transaction(
    p_user_id => v_campaign.user_id,
    p_kind => 'campaign_debit',
    p_amount_cents => -v_amount,
    p_description => COALESCE(p_description, 'Paiement campagne ' || COALESCE(v_campaign.spot_name, v_campaign.id::text)),
    p_campaign_request_id => v_campaign.id
  );

  UPDATE public.campaign_requests
  SET payment_status = 'paid',
      paid_at = now(),
      paid_amount_cents = v_amount,
      platform_fee_cents = v_fee,
      owner_amount_cents = v_owner_amount,
      payout_status = COALESCE(payout_status, 'pending'),
      updated_at = now()
  WHERE id = v_campaign.id;

  -- Gain du propriétaire du véhicule (70 %)
  SELECT owner_id INTO v_owner FROM public.vehicles WHERE id = v_campaign.vehicle_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.payee_earnings (payee_user_id, campaign_request_id, amount_cents, currency, description, status)
    VALUES (v_owner, v_campaign.id, v_owner_amount, 'eur',
            'Rémunération campagne ' || COALESCE(v_campaign.spot_name, v_campaign.id::text), 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT false, v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_campaign_from_wallet(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_campaign_from_wallet(uuid, text) TO service_role;