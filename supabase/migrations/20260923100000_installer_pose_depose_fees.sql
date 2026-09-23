-- ─────────────────────────────────────────────────────────────────────────────
-- Pose + Dépose : rémunération du poseur incluse dans le prix de campagne
--
-- Stratégie (Option 1) :
--   • pose_fee_cents / depose_fee_cents sont définis à la création de campagne
--   • Ils sont prélevés sur la commission MoveSpot (platform_fee_cents)
--   • Le poseur est payé en deux fois : à la validation de la pose, puis à la
--     validation de la dépose.
--   • Backward-compat : les campagnes existantes ont 0 par défaut.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Nouvelles colonnes sur campaign_requests
-- ────────────────────────────────────────────
ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS pose_fee_cents         integer NOT NULL DEFAULT 0 CHECK (pose_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS depose_fee_cents        integer NOT NULL DEFAULT 0 CHECK (depose_fee_cents >= 0),

  -- Statut du retrait (symétrique à installation_status)
  ADD COLUMN IF NOT EXISTS depose_status           text    CHECK (depose_status IN ('pending', 'pending_approval', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS depose_photos           jsonb,
  ADD COLUMN IF NOT EXISTS depose_notes            text,
  ADD COLUMN IF NOT EXISTS depose_reviewed_at      timestamptz,

  -- Identifiants des poseurs (pour traçabilité)
  ADD COLUMN IF NOT EXISTS pose_installer_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depose_installer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Suivi des virements poseurs
  ADD COLUMN IF NOT EXISTS pose_payout_status      text DEFAULT 'pending' CHECK (pose_payout_status   IN ('pending', 'transferred')),
  ADD COLUMN IF NOT EXISTS depose_payout_status    text DEFAULT 'pending' CHECK (depose_payout_status IN ('pending', 'transferred')),
  ADD COLUMN IF NOT EXISTS pose_stripe_transfer_id   text,
  ADD COLUMN IF NOT EXISTS depose_stripe_transfer_id text;

-- Index pour les jobs de dépose (poseurs certifiés qui cherchent des missions)
CREATE INDEX IF NOT EXISTS idx_campaign_requests_depose_status
  ON public.campaign_requests (depose_status, status)
  WHERE status = 'approved';

-- 2. Trigger : quand installation_status passe à 'approved', initialise depose_status à 'pending'
-- ──────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_init_depose_on_pose_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Déclenche seulement quand la pose vient d'être validée
  IF NEW.installation_status = 'approved'
     AND (OLD.installation_status IS DISTINCT FROM 'approved')
     AND NEW.depose_status IS NULL
  THEN
    NEW.depose_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_depose_on_pose_approved ON public.campaign_requests;
CREATE TRIGGER trg_init_depose_on_pose_approved
  BEFORE UPDATE ON public.campaign_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_init_depose_on_pose_approved();

-- 3. Vue admin : marge nette corrigée (soustrait les frais poseur)
-- ──────────────────────────────────────────────────────────────────
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
  cr.pose_fee_cents,
  cr.depose_fee_cents,
  -- Marge nette MoveSpot = commission - frais poseurs - frais Stripe estimés
  (cr.platform_fee_cents
    - COALESCE(cr.pose_fee_cents, 0)
    - COALESCE(cr.depose_fee_cents, 0)
    - ROUND(cr.paid_amount_cents * 0.029) - 30
  )::bigint AS net_margin_cents,
  ROUND(cr.platform_fee_cents::numeric * 10000 / NULLIF(cr.paid_amount_cents, 0))::integer AS effective_rate_bps,
  ap.tier AS advertiser_tier
FROM public.campaign_requests cr
LEFT JOIN public.advertiser_profiles ap ON ap.user_id = cr.user_id
WHERE cr.payment_status = 'paid'
  AND cr.paid_amount_cents IS NOT NULL
  AND cr.paid_amount_cents > 0;

GRANT SELECT ON public.campaign_margin_view TO service_role;
