-- 1. Enums
CREATE TYPE public.vehicle_type AS ENUM ('food_truck', 'van', 'taxi', 'scooter', 'voiture', 'autre');
CREATE TYPE public.vehicle_status AS ENUM ('pending', 'approved', 'rejected', 'paused');

-- Add 'owner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. owner_profiles table
CREATE TABLE public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  city TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_profiles TO authenticated;
GRANT ALL ON public.owner_profiles TO service_role;

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own profile" ON public.owner_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own profile" ON public.owner_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own profile" ON public.owner_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all owner profiles" ON public.owner_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER owner_profiles_updated_at
  BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  type public.vehicle_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  format_publicitaire TEXT NOT NULL,
  surface_m2 NUMERIC,
  km_per_day INTEGER,
  zones TEXT[] DEFAULT '{}',
  price_per_day NUMERIC NOT NULL,
  photos TEXT[] DEFAULT '{}',
  status public.vehicle_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Public can view approved vehicles only
CREATE POLICY "Anyone can view approved vehicles" ON public.vehicles
  FOR SELECT USING (status = 'approved');

-- Owners CRUD their own
CREATE POLICY "Owners can view own vehicles" ON public.vehicles
  FOR SELECT USING (
    owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Owners can insert own vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Owners can update own vehicles" ON public.vehicles
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Owners can delete own vehicles" ON public.vehicles
  FOR DELETE USING (
    owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  );

-- Admin full access
CREATE POLICY "Admins can view all vehicles" ON public.vehicles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all vehicles" ON public.vehicles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add vehicle_id and owner_response to campaign_requests
ALTER TABLE public.campaign_requests ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_requests ADD COLUMN owner_response TEXT NOT NULL DEFAULT 'pending';

-- Owners can view and respond to requests on their vehicles
CREATE POLICY "Owners can view requests on their vehicles" ON public.campaign_requests
  FOR SELECT USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE op.user_id = auth.uid()
    )
  );
CREATE POLICY "Owners can update requests on their vehicles" ON public.campaign_requests
  FOR UPDATE USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE op.user_id = auth.uid()
    )
  );

-- 5. Trigger: auto-assign 'owner' role when owner_profile created
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER owner_profile_assign_role
  AFTER INSERT ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_role();

-- Allow authenticated users to insert their own 'owner' role (via trigger using SECURITY DEFINER, so this is fine)
-- user_roles already has insert restricted; the trigger uses SECURITY DEFINER so it bypasses RLS.

-- 6. Storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vehicle photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Owners can upload their own vehicle photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update their own vehicle photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete their own vehicle photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);