-- Add referral_code to owner_profiles
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Back-fill existing profiles
UPDATE public.owner_profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Default for future inserts
ALTER TABLE public.owner_profiles
  ALTER COLUMN referral_code SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referee_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "referrals_insert_own"
  ON public.referrals FOR INSERT
  WITH CHECK (referee_id = auth.uid());

-- RPC: ensure_referral_code — auto-generate if null
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT referral_code INTO v_code
  FROM owner_profiles
  WHERE user_id = auth.uid();

  IF v_code IS NULL THEN
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    UPDATE owner_profiles
    SET referral_code = v_code
    WHERE user_id = auth.uid()
      AND referral_code IS NULL;
  END IF;

  RETURN v_code;
END;
$$;
