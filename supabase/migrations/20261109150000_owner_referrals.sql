-- Migration: owner referral system
-- Adds referral_code to owner_profiles and creates referrals table

-- 1. Add referral_code column to owner_profiles
ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Auto-generate referral codes for existing owners
UPDATE owner_profiles
SET referral_code = 'MS-' || UPPER(SUBSTR(MD5(user_id::TEXT), 1, 5))
WHERE referral_code IS NULL;

-- 3. Trigger function to auto-generate referral code on INSERT
CREATE OR REPLACE FUNCTION generate_owner_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      code := 'MS-' || UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 5));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM owner_profiles WHERE referral_code = code
      );
      attempts := attempts + 1;
      IF attempts > 20 THEN
        code := 'MS-' || UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT || NOW()::TEXT), 1, 7));
        EXIT;
      END IF;
    END LOOP;
    NEW.referral_code := code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS owner_referral_code_trigger ON owner_profiles;
CREATE TRIGGER owner_referral_code_trigger
  BEFORE INSERT ON owner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_owner_referral_code();

-- 4. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES owner_profiles(user_id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES owner_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "Owner creates referral for self as referee"
  ON referrals FOR INSERT
  WITH CHECK (referee_id = auth.uid());
