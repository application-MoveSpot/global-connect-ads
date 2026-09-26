-- Apporteurs d'affaires / commerciaux indépendants
CREATE TABLE IF NOT EXISTS commercial_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT        NOT NULL,
  phone             TEXT,
  company           TEXT,
  city              TEXT,
  commission_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  referral_code     TEXT        NOT NULL UNIQUE,
  active            BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_commercial_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_commercial_profiles_updated_at
  BEFORE UPDATE ON commercial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_commercial_profiles_updated_at();

-- Relier un annonceur à son commercial apporteur
ALTER TABLE advertiser_profiles
  ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES commercial_profiles(id) ON DELETE SET NULL;

-- Relier une campagne à son commercial + suivre la commission
ALTER TABLE campaign_requests
  ADD COLUMN IF NOT EXISTS commercial_id       UUID        REFERENCES commercial_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS commission_paid_at  TIMESTAMPTZ;

-- RLS
ALTER TABLE commercial_profiles ENABLE ROW LEVEL SECURITY;

-- Le commercial voit son propre profil
CREATE POLICY "commercial_read_own"
  ON commercial_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Le commercial peut créer son profil
CREATE POLICY "commercial_insert_own"
  ON commercial_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Le commercial peut mettre à jour son propre profil
CREATE POLICY "commercial_update_own"
  ON commercial_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Lookup public du code parrainage (pour l'inscription annonceur)
CREATE POLICY "commercial_code_public_lookup"
  ON commercial_profiles FOR SELECT
  USING (active = true);
