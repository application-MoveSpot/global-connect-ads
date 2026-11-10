CREATE OR REPLACE FUNCTION public.process_campaign_wallet_payment(
    p_advertiser_id UUID,
    p_amount        NUMERIC(10,2),
    p_region_id     UUID,
    p_start_date    DATE,
    p_end_date      DATE
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance NUMERIC(10,2);
    v_new_campaign_id UUID;
BEGIN
    -- Verrouille la ligne pour éviter les race conditions
    SELECT balance INTO v_current_balance
    FROM public.advertiser_wallets
    WHERE advertiser_id = p_advertiser_id
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success',         false,
            'error',           'Solde insuffisant',
            'current_balance', v_current_balance
        );
    END IF;

    UPDATE public.advertiser_wallets
    SET balance    = balance - p_amount,
        updated_at = NOW()
    WHERE advertiser_id = p_advertiser_id;

    INSERT INTO public.campaigns (advertiser_id, region_id, start_date, end_date, total_cost, status)
    VALUES (p_advertiser_id, p_region_id, p_start_date, p_end_date, p_amount, 'pending_allocation')
    RETURNING id INTO v_new_campaign_id;

    INSERT INTO public.wallet_transactions (advertiser_id, campaign_id, amount, type, description)
    VALUES (p_advertiser_id, v_new_campaign_id, -p_amount, 'campaign_payment',
            'Paiement de campagne publicitaire via Yield Management');

    RETURN jsonb_build_object(
        'success',     true,
        'campaign_id', v_new_campaign_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
