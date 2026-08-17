-- Stripe subscriptions : colonnes prestataires + table partenaires
-- Lookup keys Stripe à créer dans le Dashboard :
--   provider_monthly  → abonnement mensuel prestataire
--   partner_monthly   → abonnement mensuel partenaire

-- 1. Colonnes Stripe sur les profils prestataires existants
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id         text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_period_end timestamptz;

-- 2. Table des profils partenaires
CREATE TABLE IF NOT EXISTS partner_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company     text NOT NULL,
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  website     text,
  description text,
  status      text NOT NULL DEFAULT 'pending',
  admin_notes text,
  stripe_customer_id              text,
  stripe_subscription_id          text,
  stripe_subscription_status      text,
  stripe_subscription_period_end  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS partner_profiles
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_profiles_self_select"
  ON partner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "partner_profiles_self_insert"
  ON partner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "partner_profiles_self_update"
  ON partner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "partner_profiles_admin_all"
  ON partner_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 4. Index pour les recherches par subscription Stripe
CREATE INDEX IF NOT EXISTS idx_provider_profiles_stripe_subscription
  ON provider_profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_profiles_stripe_subscription
  ON partner_profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
