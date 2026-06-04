
-- Enums
CREATE TYPE public.brief_status AS ENUM ('open', 'closed', 'fulfilled', 'cancelled');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- Table: advertiser_briefs
CREATE TABLE public.advertiser_briefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  vehicle_types vehicle_type[] NOT NULL DEFAULT '{}',
  zones text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer,
  budget_max numeric,
  audience_target text,
  creative_files text[] NOT NULL DEFAULT '{}',
  status brief_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_briefs TO authenticated;
GRANT ALL ON public.advertiser_briefs TO service_role;

ALTER TABLE public.advertiser_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers manage own briefs select"
  ON public.advertiser_briefs FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers insert own briefs"
  ON public.advertiser_briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers update own briefs"
  ON public.advertiser_briefs FOR UPDATE TO authenticated
  USING (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers delete own briefs"
  ON public.advertiser_briefs FOR DELETE TO authenticated
  USING (auth.uid() = advertiser_id);
CREATE POLICY "Owners can view open briefs"
  ON public.advertiser_briefs FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.owner_profiles op
      WHERE op.user_id = auth.uid()
    )
  );
CREATE POLICY "Admins view all briefs"
  ON public.advertiser_briefs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all briefs"
  ON public.advertiser_briefs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER advertiser_briefs_updated_at
  BEFORE UPDATE ON public.advertiser_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: brief_proposals
CREATE TABLE public.brief_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id uuid NOT NULL REFERENCES public.advertiser_briefs(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  price_per_day numeric NOT NULL,
  message text,
  status proposal_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brief_id, vehicle_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_proposals TO authenticated;
GRANT ALL ON public.brief_proposals TO service_role;

ALTER TABLE public.brief_proposals ENABLE ROW LEVEL SECURITY;

-- Owner: full control over own proposals
CREATE POLICY "Owners view own proposals"
  ON public.brief_proposals FOR SELECT TO authenticated
  USING (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners insert own proposals"
  ON public.brief_proposals FOR INSERT TO authenticated
  WITH CHECK (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners update own proposals"
  ON public.brief_proposals FOR UPDATE TO authenticated
  USING (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()));

-- Advertiser (brief owner): can read + update status of proposals on their briefs
CREATE POLICY "Advertisers view proposals on own briefs"
  ON public.brief_proposals FOR SELECT TO authenticated
  USING (brief_id IN (SELECT id FROM public.advertiser_briefs WHERE advertiser_id = auth.uid()));
CREATE POLICY "Advertisers update proposals on own briefs"
  ON public.brief_proposals FOR UPDATE TO authenticated
  USING (brief_id IN (SELECT id FROM public.advertiser_briefs WHERE advertiser_id = auth.uid()));

-- Admin
CREATE POLICY "Admins view all proposals"
  ON public.brief_proposals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all proposals"
  ON public.brief_proposals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER brief_proposals_updated_at
  BEFORE UPDATE ON public.brief_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: on proposal acceptance, auto-create campaign_request + mark brief fulfilled
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brief public.advertiser_briefs%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_advertiser public.advertiser_profiles%ROWTYPE;
  v_email text;
  v_days integer;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_brief FROM public.advertiser_briefs WHERE id = NEW.brief_id;
  SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;
  SELECT * INTO v_advertiser FROM public.advertiser_profiles WHERE user_id = v_brief.advertiser_id;
  SELECT email INTO v_email FROM auth.users WHERE id = v_brief.advertiser_id;

  v_days := COALESCE(v_brief.days_count, (v_brief.end_date - v_brief.start_date + 1));

  -- Create campaign request (auto_validate trigger will handle status)
  INSERT INTO public.campaign_requests (
    spot_id, spot_name, spot_location, spot_price,
    company, email, message,
    vehicle_id, user_id,
    start_date, end_date, days_count, total_price,
    route_zones, creative_files
  ) VALUES (
    NEW.vehicle_id::text,
    v_vehicle.name,
    array_to_string(v_brief.zones, ', '),
    NEW.price_per_day,
    COALESCE(v_advertiser.company, v_advertiser.full_name, 'Annonceur'),
    COALESCE(v_email, ''),
    format('Campagne issue du brief « %s ». %s', v_brief.title, COALESCE(NEW.message, '')),
    NEW.vehicle_id,
    v_brief.advertiser_id,
    v_brief.start_date,
    v_brief.end_date,
    v_days,
    NEW.price_per_day * v_days,
    v_brief.zones,
    v_brief.creative_files
  );

  -- Mark brief fulfilled, reject other pending proposals
  UPDATE public.advertiser_briefs SET status = 'fulfilled' WHERE id = NEW.brief_id;
  UPDATE public.brief_proposals
    SET status = 'rejected'
    WHERE brief_id = NEW.brief_id AND id <> NEW.id AND status = 'pending';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_proposal_acceptance
  AFTER UPDATE OF status ON public.brief_proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_acceptance();
