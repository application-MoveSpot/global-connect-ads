
-- 1) Add 'advertiser' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advertiser';

-- 2) advertiser_profiles table
CREATE TABLE public.advertiser_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_profiles TO authenticated;
GRANT ALL ON public.advertiser_profiles TO service_role;

ALTER TABLE public.advertiser_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers can view own profile"
  ON public.advertiser_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Advertisers can insert own profile"
  ON public.advertiser_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Advertisers can update own profile"
  ON public.advertiser_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all advertiser profiles"
  ON public.advertiser_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_advertiser_profiles_updated_at
  BEFORE UPDATE ON public.advertiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Trigger to assign 'advertiser' role on profile creation
CREATE OR REPLACE FUNCTION public.assign_advertiser_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'advertiser')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_advertiser_role_trigger
  AFTER INSERT ON public.advertiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_advertiser_role();

-- 4) Add user_id to campaign_requests
ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 5) Update campaign_requests RLS for advertisers
CREATE POLICY "Advertisers can view own requests"
  ON public.campaign_requests FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Restrict inserts to authenticated users with matching user_id (or NULL for legacy)
DROP POLICY IF EXISTS "Anyone can insert campaign requests" ON public.campaign_requests;

CREATE POLICY "Authenticated users can insert own requests"
  ON public.campaign_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
