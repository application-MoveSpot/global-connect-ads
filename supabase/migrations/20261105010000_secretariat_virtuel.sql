-- ─────────────────────────────────────────────────────────────────────────────
-- Secrétariat Virtuel (SV) — programme autonome Finance & Juridique
-- Dépend de : campaign_requests, owner_profiles, payee_profiles, vehicles
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table sv_contracts : contrats générés automatiquement ───────────────────
CREATE TABLE IF NOT EXISTS sv_contracts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id  uuid        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  contract_type        text        NOT NULL
                                   CHECK (contract_type IN (
                                     'advertiser_campaign',
                                     'owner_hosting',
                                     'installer_pose',
                                     'installer_depose'
                                   )),
  party_user_id        uuid        NOT NULL,
  status               text        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft','sent','signed','expired','cancelled')),
  content_md           text,
  signed_at            timestamptz,
  expires_at           timestamptz,
  pdf_url              text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sv_contracts_campaign_idx ON sv_contracts (campaign_request_id);
CREATE INDEX IF NOT EXISTS sv_contracts_party_idx    ON sv_contracts (party_user_id);

ALTER TABLE sv_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sv_contracts_admin_all" ON sv_contracts;
CREATE POLICY "sv_contracts_admin_all" ON sv_contracts
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "sv_contracts_party_select" ON sv_contracts;
CREATE POLICY "sv_contracts_party_select" ON sv_contracts
  FOR SELECT
  USING (party_user_id = auth.uid());

-- 2. Table sv_payout_queue : file d'attente des virements ────────────────────
CREATE TABLE IF NOT EXISTS sv_payout_queue (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id  uuid        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  payout_type          text        NOT NULL
                                   CHECK (payout_type IN (
                                     'owner_final',
                                     'installer_pose',
                                     'installer_depose',
                                     'advertiser_refund'
                                   )),
  recipient_user_id    uuid        NOT NULL,
  stripe_account_id    text,
  amount_cents         integer     NOT NULL CHECK (amount_cents > 0),
  currency             text        NOT NULL DEFAULT 'eur',
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','processing','transferred','failed','cancelled')),
  stripe_transfer_id   text,
  stripe_payout_id     text,
  error_message        text,
  retry_count          integer     NOT NULL DEFAULT 0,
  scheduled_at         timestamptz NOT NULL DEFAULT now(),
  processed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sv_payout_pending_idx ON sv_payout_queue (status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS sv_payout_campaign_idx ON sv_payout_queue (campaign_request_id);

ALTER TABLE sv_payout_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sv_payout_admin_all" ON sv_payout_queue;
CREATE POLICY "sv_payout_admin_all" ON sv_payout_queue
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Table sv_refund_decisions : décisions de remboursement ──────────────────
CREATE TABLE IF NOT EXISTS sv_refund_decisions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id  uuid        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  refund_request_id    uuid        REFERENCES refund_requests(id) ON DELETE SET NULL,
  decision             text        NOT NULL
                                   CHECK (decision IN ('approved','partial','rejected')),
  refund_amount_cents  integer     NOT NULL DEFAULT 0,
  reason               text,
  stripe_refund_id     text,
  decided_at           timestamptz NOT NULL DEFAULT now(),
  executed_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sv_refund_campaign_idx ON sv_refund_decisions (campaign_request_id);

ALTER TABLE sv_refund_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sv_refund_admin_all" ON sv_refund_decisions;
CREATE POLICY "sv_refund_admin_all" ON sv_refund_decisions
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Trigger : pm_status → awaiting_installation → générer contrats ──────────
CREATE OR REPLACE FUNCTION fn_sv_on_campaign_awaiting_installation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.pm_status IS DISTINCT FROM 'awaiting_installation'
     AND NEW.pm_status = 'awaiting_installation' THEN

    -- Déclencher la génération des contrats via SV
    PERFORM fn_pm_call_edge('sv-generate-contract', jsonb_build_object(
      'campaign_id', NEW.id,
      'trigger', 'awaiting_installation'
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sv_awaiting_installation ON campaign_requests;
CREATE TRIGGER trg_sv_awaiting_installation
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_sv_on_campaign_awaiting_installation();

-- 5. Trigger : payout_status → pending_transfer → déclencher virement ────────
CREATE OR REPLACE FUNCTION fn_sv_on_payout_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Virement propriétaire
  IF OLD.payout_status IS DISTINCT FROM 'pending_transfer'
     AND NEW.payout_status = 'pending_transfer'
     AND NEW.owner_amount_cents > 0 THEN

    INSERT INTO sv_payout_queue (
      campaign_request_id, payout_type, recipient_user_id, amount_cents
    )
    SELECT
      NEW.id,
      'owner_final',
      v.owner_id,
      NEW.owner_amount_cents
    FROM vehicles v
    WHERE v.id = NEW.vehicle_id
    ON CONFLICT DO NOTHING;

    PERFORM fn_pm_call_edge('sv-trigger-payout', jsonb_build_object(
      'campaign_id', NEW.id,
      'payout_type', 'owner_final'
    ));
  END IF;

  -- Virement poseur installation
  IF OLD.pose_payout_status IS DISTINCT FROM 'pending_transfer'
     AND NEW.pose_payout_status = 'pending_transfer'
     AND COALESCE(NEW.pose_fee_cents, 0) > 0
     AND NEW.pose_installer_user_id IS NOT NULL THEN

    INSERT INTO sv_payout_queue (
      campaign_request_id, payout_type, recipient_user_id, amount_cents
    )
    VALUES (
      NEW.id,
      'installer_pose',
      NEW.pose_installer_user_id,
      NEW.pose_fee_cents
    )
    ON CONFLICT DO NOTHING;

    PERFORM fn_pm_call_edge('sv-trigger-payout', jsonb_build_object(
      'campaign_id', NEW.id,
      'payout_type', 'installer_pose'
    ));
  END IF;

  -- Virement poseur dépose
  IF OLD.depose_payout_status IS DISTINCT FROM 'pending_transfer'
     AND NEW.depose_payout_status = 'pending_transfer'
     AND COALESCE(NEW.depose_fee_cents, 0) > 0
     AND NEW.depose_installer_user_id IS NOT NULL THEN

    INSERT INTO sv_payout_queue (
      campaign_request_id, payout_type, recipient_user_id, amount_cents
    )
    VALUES (
      NEW.id,
      'installer_depose',
      NEW.depose_installer_user_id,
      NEW.depose_fee_cents
    )
    ON CONFLICT DO NOTHING;

    PERFORM fn_pm_call_edge('sv-trigger-payout', jsonb_build_object(
      'campaign_id', NEW.id,
      'payout_type', 'installer_depose'
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sv_payout_pending ON campaign_requests;
CREATE TRIGGER trg_sv_payout_pending
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_sv_on_payout_pending();

-- 6. Trigger : refund_requests → approved → déclencher remboursement ──────────
CREATE OR REPLACE FUNCTION fn_sv_on_refund_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'approved'
     AND NEW.status = 'approved'
     AND NEW.campaign_request_id IS NOT NULL THEN

    PERFORM fn_pm_call_edge('sv-compute-refund', jsonb_build_object(
      'campaign_id', NEW.campaign_request_id,
      'refund_request_id', NEW.id,
      'requested_amount_cents', NEW.amount_cents
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sv_refund_approved ON refund_requests;
CREATE TRIGGER trg_sv_refund_approved
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_sv_on_refund_approved();

-- 7. Vue admin : tableau de bord SV ──────────────────────────────────────────
CREATE OR REPLACE VIEW sv_dashboard AS
SELECT
  cr.id                     AS campaign_id,
  cr.pm_status,
  cr.payout_status,
  cr.pose_payout_status,
  cr.depose_payout_status,
  cr.owner_amount_cents,
  cr.pose_fee_cents,
  cr.depose_fee_cents,
  cr.paid_amount_cents,
  cr.stripe_payment_intent_id,
  cr.stripe_transfer_id,
  cr.pose_stripe_transfer_id,
  cr.depose_stripe_transfer_id,
  (SELECT COUNT(*) FROM sv_contracts c WHERE c.campaign_request_id = cr.id)   AS contracts_count,
  (SELECT COUNT(*) FROM sv_payout_queue p WHERE p.campaign_request_id = cr.id AND p.status = 'pending') AS pending_payouts,
  (SELECT COUNT(*) FROM sv_payout_queue p WHERE p.campaign_request_id = cr.id AND p.status = 'transferred') AS done_payouts
FROM campaign_requests cr
WHERE cr.pm_status IN ('completing', 'completed', 'active', 'incident');
