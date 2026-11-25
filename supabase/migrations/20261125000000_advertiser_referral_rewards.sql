-- ============================================================
-- Migration : advertiser_referral_rewards
-- Parrainage annonceur-à-annonceur sur MoveSpot
-- ============================================================

-- 1. Ajouter referral_code à advertiser_profiles (si absent)
ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Back-fill avec un code 8 car unique
UPDATE public.advertiser_profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Default pour les futures insertions
ALTER TABLE public.advertiser_profiles
  ALTER COLUMN referral_code
  SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- 2. Table principale des récompenses de parrainage
CREATE TABLE IF NOT EXISTS public.advertiser_referral_rewards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID        NOT NULL
                 REFERENCES public.advertiser_profiles(id) ON DELETE CASCADE,
  referee_id   UUID        NOT NULL
                 REFERENCES public.advertiser_profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'credited')),
  reward_cents INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at  TIMESTAMPTZ,
  UNIQUE (referrer_id, referee_id)
);

-- 3. RLS
ALTER TABLE public.advertiser_referral_rewards ENABLE ROW LEVEL SECURITY;

-- Admin : accès total (service_role bypass RLS automatiquement)
CREATE POLICY "admin_all_referral_rewards"
  ON public.advertiser_referral_rewards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Annonceur référent : lecture de ses propres lignes
CREATE POLICY "referrer_select_own_rewards"
  ON public.advertiser_referral_rewards
  FOR SELECT
  USING (
    referrer_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    )
  );

-- 4. Fonction RPC : credit_advertiser_referral
--    Marque la récompense comme créditée (et crédite le wallet du référent)
CREATE OR REPLACE FUNCTION public.credit_advertiser_referral(
  p_referee_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_referrer_user_id UUID;
BEGIN
  -- Récupérer la récompense pending pour ce filleul
  SELECT r.*, ap_ref.user_id AS referrer_user_id
  INTO v_reward
  FROM public.advertiser_referral_rewards r
  JOIN public.advertiser_profiles ap_fil ON ap_fil.id = r.referee_id
  JOIN public.advertiser_profiles ap_ref ON ap_ref.id = r.referrer_id
  WHERE ap_fil.user_id = p_referee_user_id
    AND r.status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune récompense de parrainage en attente pour cet utilisateur';
  END IF;

  -- Marquer comme crédité
  UPDATE public.advertiser_referral_rewards
  SET status      = 'credited',
      credited_at = now()
  WHERE id = v_reward.id;

  -- Créditer le wallet du référent si reward_cents > 0
  IF v_reward.reward_cents > 0 THEN
    PERFORM public.apply_wallet_transaction(
      p_user_id      => v_reward.referrer_user_id,
      p_kind         => 'referral_credit',
      p_amount_cents => v_reward.reward_cents,
      p_description  => 'Bonus parrainage annonceur filleul #' || v_reward.id::text
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_advertiser_referral(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_advertiser_referral(uuid) TO service_role;

-- 5. Recharger le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
