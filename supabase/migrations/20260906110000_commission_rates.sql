-- ─────────────────────────────────────────────────────────────────────────────
-- Commission dynamique : table commission_rates + tier sur advertiser_profiles
-- + réécriture de settle_campaign_from_wallet pour taux variable + plancher auto
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tier annonceur + SIRET sur advertiser_profiles
-- ─────────────────────────────────────────────────
ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'particulier'
    CHECK (tier IN ('particulier', 'pme', 'enterprise'));

-- Promotion automatique vers 'pme' dès qu'un SIRET est saisi
CREATE OR REPLACE FUNCTION public.trg_fn_promote_advertiser_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Monte vers pme si SIRET renseigné et encore en tier inférieur
  IF NEW.siret IS NOT NULL AND NEW.siret != '' AND NEW.tier = 'particulier' THEN
    NEW.tier := 'pme';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_advertiser_tier ON public.advertiser_profiles;
CREATE TRIGGER trg_promote_advertiser_tier
  BEFORE INSERT OR UPDATE ON public.advertiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_promote_advertiser_tier();


-- 2. Table commission_rates
-- ─────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_rates (
  id          serial PRIMARY KEY,
  tier        text        NOT NULL CHECK (tier IN ('particulier', 'pme', 'enterprise')),
  rate_bps    integer     NOT NULL CHECK (rate_bps BETWEEN 500 AND 5000),
    -- basis points : 3000 = 30 %, 2500 = 25 %
  min_fee_cents integer   NOT NULL DEFAULT 100 CHECK (min_fee_cents >= 0),
    -- plancher : si commission calculée < min_fee_cents, on applique min_fee_cents
    -- (auto-ajustement pour couvrir les frais Stripe ~2.9 % + 0,30 €)
  effective_from timestamptz NOT NULL DEFAULT now(),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

-- Lecture pour les admins (lecture via service_role côté serveur)
CREATE POLICY "authenticated_select" ON public.commission_rates
  FOR SELECT USING (true);
CREATE POLICY "service_role_all" ON public.commission_rates
  USING (true) WITH CHECK (true);

GRANT SELECT ON public.commission_rates TO authenticated;
GRANT ALL ON public.commission_rates TO service_role;

-- Valeurs initiales (peuvent être modifiées via le dashboard admin)
INSERT INTO public.commission_rates (tier, rate_bps, min_fee_cents, notes) VALUES
  ('particulier', 3000, 100, 'Taux initial — particuliers et associations'),
  ('pme',         2500, 100, 'Taux initial — PME et indépendants avec SIRET'),
  ('enterprise',  2500, 100, 'Taux initial — grand compte (à renégocier manuellement)');


-- 3. Fonction utilitaire : taux effectif d'un annonceur
-- ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_advertiser_commission(p_user_id uuid)
RETURNS TABLE (rate_bps integer, min_fee_cents integer, tier text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cr.rate_bps, cr.min_fee_cents, cr.tier
  FROM public.commission_rates cr
  JOIN public.advertiser_profiles ap ON ap.tier = cr.tier
  WHERE ap.user_id = p_user_id
  ORDER BY cr.effective_from DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_advertiser_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_advertiser_commission(uuid) TO service_role;


-- 4. Réécriture de settle_campaign_from_wallet — commission dynamique
-- ────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.settle_campaign_from_wallet(uuid, text);

CREATE OR REPLACE FUNCTION public.settle_campaign_from_wallet(
  p_campaign_request_id uuid,
  p_description         text DEFAULT NULL
)
RETURNS TABLE (already_paid boolean, amount_cents bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign       public.campaign_requests;
  v_amount         bigint;
  v_rate_bps       integer;
  v_min_fee        integer;
  v_platform_fee   bigint;
  v_owner_amount   bigint;
  v_owner          uuid;
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

  -- Lecture du taux dynamique depuis commission_rates
  SELECT c.rate_bps, c.min_fee_cents
  INTO v_rate_bps, v_min_fee
  FROM public.get_advertiser_commission(v_campaign.user_id) c;

  -- Fallback : annonceur sans profil → taux 'particulier' le plus récent
  IF v_rate_bps IS NULL THEN
    SELECT cr.rate_bps, cr.min_fee_cents
    INTO v_rate_bps, v_min_fee
    FROM public.commission_rates cr
    WHERE cr.tier = 'particulier'
    ORDER BY cr.effective_from DESC
    LIMIT 1;
  END IF;

  -- Sécurité ultime : si la table est vide, on tombe sur 30 % / plancher 1 €
  v_rate_bps := COALESCE(v_rate_bps, 3000);
  v_min_fee  := COALESCE(v_min_fee,  100);

  -- Commission = MAX(montant × taux, plancher)
  -- Le plancher couvre les frais Stripe estimés (~2,9 % + 0,30 €) quand la
  -- campagne est petite et garantit une marge nette positive.
  v_platform_fee := GREATEST(
    ROUND(v_amount * v_rate_bps::numeric / 10000)::bigint,
    v_min_fee::bigint
  );
  v_owner_amount := v_amount - v_platform_fee;

  -- Débit du portefeuille annonceur (atomic : rollback si échec)
  PERFORM public.apply_wallet_transaction(
    p_user_id            => v_campaign.user_id,
    p_kind               => 'campaign_debit',
    p_amount_cents       => -v_amount,
    p_description        => COALESCE(
      p_description,
      'Paiement campagne ' || COALESCE(v_campaign.spot_name, v_campaign.id::text)
    ),
    p_campaign_request_id => v_campaign.id
  );

  UPDATE public.campaign_requests
  SET payment_status    = 'paid',
      paid_at           = now(),
      paid_amount_cents = v_amount,
      platform_fee_cents = v_platform_fee,
      owner_amount_cents = v_owner_amount,
      payout_status     = COALESCE(payout_status, 'pending'),
      updated_at        = now()
  WHERE id = v_campaign.id;

  -- Gain du propriétaire du véhicule
  SELECT owner_id INTO v_owner
  FROM public.vehicles
  WHERE id = v_campaign.vehicle_id;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.payee_earnings (
      payee_user_id, campaign_request_id, amount_cents, currency, description, status
    ) VALUES (
      v_owner, v_campaign.id, v_owner_amount, 'eur',
      'Rémunération campagne ' || COALESCE(v_campaign.spot_name, v_campaign.id::text),
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT false, v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_campaign_from_wallet(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_campaign_from_wallet(uuid, text) TO service_role;


-- 5. Vue admin : marge nette par campagne (surveillance des coûts)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.campaign_margin_view
WITH (security_invoker = true)
AS
SELECT
  cr.id,
  cr.spot_name,
  cr.paid_at,
  cr.paid_amount_cents,
  cr.platform_fee_cents,
  cr.owner_amount_cents,
  -- Estimation frais Stripe : 2,9 % + 30 centimes
  (ROUND(cr.paid_amount_cents * 0.029) + 30)::bigint  AS stripe_fee_estimate_cents,
  -- Marge nette MoveSpot après Stripe
  (cr.platform_fee_cents - ROUND(cr.paid_amount_cents * 0.029) - 30)::bigint AS net_margin_cents,
  -- Taux effectivement appliqué en basis points (reconstitué)
  ROUND(cr.platform_fee_cents::numeric * 10000 / NULLIF(cr.paid_amount_cents, 0))::integer AS effective_rate_bps,
  ap.tier AS advertiser_tier
FROM public.campaign_requests cr
LEFT JOIN public.advertiser_profiles ap ON ap.user_id = cr.user_id
WHERE cr.payment_status = 'paid'
  AND cr.paid_amount_cents IS NOT NULL
  AND cr.paid_amount_cents > 0;

GRANT SELECT ON public.campaign_margin_view TO service_role;
