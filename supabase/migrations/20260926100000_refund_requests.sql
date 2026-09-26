-- Demandes de remboursement déposées par les annonceurs
CREATE TABLE IF NOT EXISTS refund_requests (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_request_id  UUID        REFERENCES campaign_requests(id) ON DELETE SET NULL,
  amount_cents         INTEGER,
  reason               TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes          TEXT,
  stripe_refund_id     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_refund_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_refund_requests_updated_at();

-- RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Annonceur : voir ses propres demandes
CREATE POLICY "advertiser_read_own_refunds"
  ON refund_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Annonceur : créer une demande
CREATE POLICY "advertiser_insert_own_refunds"
  ON refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin : accès total (utilise supabaseAdmin côté serveur)
