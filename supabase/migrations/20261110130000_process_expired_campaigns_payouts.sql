-- Clôture les campagnes expirées et génère les demandes de virement propriétaires
CREATE OR REPLACE FUNCTION public.process_expired_campaigns_payouts()
RETURNS JSONB AS $$
DECLARE
    v_campaign RECORD;
    v_allocation RECORD;
    v_owner_count INT;
    v_owner_payout NUMERIC(10,2);
    v_total_processed_campaigns INT := 0;
    v_total_generated_transfers INT := 0;
BEGIN
    -- 1. Sélectionner et verrouiller les campagnes actives qui ont dépassé leur date de fin
    FOR v_campaign IN
        SELECT id, total_cost, region_id
        FROM public.campaigns
        WHERE status = 'active' AND end_date < NOW()::DATE
        FOR UPDATE
    LOOP
        -- 2. Compter le nombre de propriétaires uniques alloués à cette campagne
        SELECT COUNT(DISTINCT v.owner_id) INTO v_owner_count
        FROM public.campaign_allocations ca
        JOIN public.vehicles v ON ca.vehicle_id = v.id
        WHERE ca.campaign_id = v_campaign.id;

        IF v_owner_count > 0 THEN
            -- 3. Part de 70% globale divisée équitablement par propriétaire
            v_owner_payout := ROUND(((v_campaign.total_cost * 0.70) / v_owner_count), 2);

            -- 4. Générer une demande de virement pour chaque propriétaire avec compte Stripe
            FOR v_allocation IN
                SELECT DISTINCT v.owner_id, v.stripe_account_id
                FROM public.campaign_allocations ca
                JOIN public.vehicles v ON ca.vehicle_id = v.id
                WHERE ca.campaign_id = v_campaign.id AND v.stripe_account_id IS NOT NULL
            LOOP
                INSERT INTO public.bank_transfer_requests (
                    owner_id,
                    amount,
                    status,
                    description,
                    created_at,
                    updated_at
                ) VALUES (
                    v_allocation.owner_id,
                    v_owner_payout,
                    'pending',
                    'Rémunération MoveSpot — Clôture de la campagne #' || v_campaign.id,
                    NOW(),
                    NOW()
                );

                v_total_generated_transfers := v_total_generated_transfers + 1;
            END LOOP;
        END IF;

        -- 5. Clôturer la campagne
        UPDATE public.campaigns
        SET status    = 'completed',
            updated_at = NOW()
        WHERE id = v_campaign.id;

        v_total_processed_campaigns := v_total_processed_campaigns + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success',                   true,
        'processed_campaigns_count', v_total_processed_campaigns,
        'generated_transfers_count', v_total_generated_transfers
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
