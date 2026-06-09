
-- Add 'provider' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';

-- Provider profiles (covering printing service providers)
CREATE TABLE public.provider_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  siret TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  description TEXT NOT NULL,
  services TEXT[] NOT NULL DEFAULT ARRAY['covering_vehicule']::TEXT[],
  coverage_areas TEXT[] NOT NULL DEFAULT '{}',
  portfolio_urls TEXT[] NOT NULL DEFAULT '{}',
  pricing_info TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.provider_profiles TO authenticated;
GRANT SELECT ON public.provider_profiles TO anon;
GRANT ALL ON public.provider_profiles TO service_role;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read approved providers (directory)
CREATE POLICY "Public reads approved providers"
  ON public.provider_profiles FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Providers read own profile"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all providers"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own provider profile"
  ON public.provider_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers update own profile"
  ON public.provider_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = (SELECT status FROM public.provider_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins update any provider"
  ON public.provider_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER provider_profiles_updated_at
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-assign provider role
CREATE OR REPLACE FUNCTION public.assign_provider_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_provider_role_trg
  AFTER INSERT ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_provider_role();

-- Quote requests from advertisers to providers
CREATE TABLE public.service_quotes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  vehicle_type TEXT,
  format TEXT,
  quantity INT,
  deadline DATE,
  zone TEXT,
  message TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','quoted','accepted','rejected','cancelled')),
  quoted_price_cents BIGINT,
  quoted_currency TEXT DEFAULT 'eur',
  quoted_message TEXT,
  quoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.service_quotes TO authenticated;
GRANT ALL ON public.service_quotes TO service_role;
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertiser reads own quotes"
  ON public.service_quotes FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);

CREATE POLICY "Provider reads own quotes"
  ON public.service_quotes FOR SELECT TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Admin reads all quotes"
  ON public.service_quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertiser creates quote"
  ON public.service_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Advertiser updates own quote"
  ON public.service_quotes FOR UPDATE TO authenticated
  USING (auth.uid() = advertiser_id)
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Provider updates own quote"
  ON public.service_quotes FOR UPDATE TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE TRIGGER service_quotes_updated_at
  BEFORE UPDATE ON public.service_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_quotes_provider ON public.service_quotes(provider_id, status);
CREATE INDEX idx_service_quotes_advertiser ON public.service_quotes(advertiser_id, status);
