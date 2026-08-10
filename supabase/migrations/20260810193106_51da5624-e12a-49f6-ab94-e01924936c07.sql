CREATE TABLE public.payee_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'driver',
  full_name text NOT NULL,
  phone text,
  city text,
  siret text,
  siret_denomination text,
  siret_verified_at timestamp with time zone,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  stripe_account_id text,
  stripe_charges_enabled boolean NOT NULL DEFAULT false,
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  stripe_details_submitted boolean NOT NULL DEFAULT false,
  stripe_onboarding_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payee_profiles_kind_check CHECK (kind IN ('driver','installer','both')),
  CONSTRAINT payee_profiles_status_check CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE ON public.payee_profiles TO authenticated;
GRANT ALL ON public.payee_profiles TO service_role;

ALTER TABLE public.payee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payees can view their own profile"
  ON public.payee_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payee profiles"
  ON public.payee_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Payees can create their own profile"
  ON public.payee_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Payees can update their own profile"
  ON public.payee_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update payee profiles"
  ON public.payee_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payee_profiles_updated_at
  BEFORE UPDATE ON public.payee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assign_driver_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_driver_role() FROM anon, authenticated;

CREATE TRIGGER payee_profiles_assign_role
  AFTER INSERT ON public.payee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_driver_role();