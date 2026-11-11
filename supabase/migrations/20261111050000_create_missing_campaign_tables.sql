-- =============================================================================
-- Migration : tables manquantes pour les campagnes + correction
--             process_campaign_wallet_payment()
-- =============================================================================

-- ─── 1. Table advertiser_wallets ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advertiser_wallets (
    advertiser_id UUID        PRIMARY KEY,
    balance       NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2. Table campaigns ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID,
    region_id     UUID,
    start_date    DATE          NOT NULL,
    end_date      DATE          NOT NULL,
    total_cost    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status        TEXT          NOT NULL DEFAULT 'pending_allocation'
                    CHECK (status IN (
                        'pending_allocation', 'active', 'completed', 'cancelled'
                    )),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 3. Table campaign_allocations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_allocations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    vehicle_id  UUID        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, vehicle_id)
);

-- ─── 4. Correction de process_campaign_wallet_payment() ──────────────────────
-- Suppression de l'INSERT dans wallet_transactions qui référençait des colonnes
-- inexistantes (advertiser_id, campaign_id, amount, type).
-- La logique métier principale (débit + création campagne) est conservée.

CREATE OR REPLACE FUNCTION public.process_campaign_wallet_payment(
    p_advertiser_id UUID,
    p_amount        NUMERIC(10,2),
    p_region_id     UUID,
    p_start_date    DATE,
    p_end_date      DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC(10,2);
    v_new_campaign_id UUID;
BEGIN
    -- Verrouillage de la ligne pour éviter les race conditions (double-spend)
    SELECT balance INTO v_current_balance
    FROM public.advertiser_wallets
    WHERE advertiser_id = p_advertiser_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'Portefeuille introuvable'
        );
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success',         false,
            'error',           'Solde insuffisant',
            'current_balance', v_current_balance
        );
    END IF;

    -- Débit du portefeuille
    UPDATE public.advertiser_wallets
    SET balance    = balance - p_amount,
        updated_at = NOW()
    WHERE advertiser_id = p_advertiser_id;

    -- Création de la campagne
    INSERT INTO public.campaigns (
        advertiser_id, region_id, start_date, end_date, total_cost, status
    ) VALUES (
        p_advertiser_id, p_region_id, p_start_date, p_end_date, p_amount,
        'pending_allocation'
    )
    RETURNING id INTO v_new_campaign_id;

    RETURN jsonb_build_object(
        'success',     true,
        'campaign_id', v_new_campaign_id
    );
END;
$$;

-- Note : RLS est désactivé par défaut sur les nouvelles tables Supabase.
-- L'accès en écriture depuis les tests se fait via la service-role key.
