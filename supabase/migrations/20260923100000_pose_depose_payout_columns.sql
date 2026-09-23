-- Colonnes pour le cycle dépose poseur et le suivi des paiements pose/dépose
ALTER TABLE campaign_requests
  ADD COLUMN IF NOT EXISTS depose_photos JSONB,
  ADD COLUMN IF NOT EXISTS depose_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS depose_notes TEXT,
  ADD COLUMN IF NOT EXISTS depose_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS depose_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depose_payout_status TEXT,
  ADD COLUMN IF NOT EXISTS depose_stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS depose_installer_user_id UUID,
  ADD COLUMN IF NOT EXISTS pose_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pose_payout_status TEXT,
  ADD COLUMN IF NOT EXISTS pose_stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS pose_installer_user_id UUID;
