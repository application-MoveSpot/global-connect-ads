CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.advertiser_briefs(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.brief_proposals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('advertiser', 'owner')),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read messages" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.advertiser_briefs b WHERE b.id = brief_id AND b.advertiser_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.brief_proposals p JOIN public.owner_profiles o ON o.id = p.owner_id WHERE p.id = proposal_id AND o.user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND (
    (sender_role = 'advertiser' AND EXISTS (SELECT 1 FROM public.advertiser_briefs b WHERE b.id = brief_id AND b.advertiser_id = auth.uid()))
    OR (sender_role = 'owner' AND EXISTS (SELECT 1 FROM public.brief_proposals p JOIN public.owner_profiles o ON o.id = p.owner_id WHERE p.id = proposal_id AND o.user_id = auth.uid()))
  )
);
CREATE POLICY "Recipients can mark read" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.advertiser_briefs b WHERE b.id = brief_id AND b.advertiser_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.brief_proposals p JOIN public.owner_profiles o ON o.id = p.owner_id WHERE p.id = proposal_id AND o.user_id = auth.uid())
) WITH CHECK (true);

CREATE TABLE public.owner_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id uuid NOT NULL REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_request_id)
);
GRANT SELECT, INSERT ON public.owner_reviews TO authenticated;
GRANT ALL ON public.owner_reviews TO service_role;
ALTER TABLE public.owner_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read reviews" ON public.owner_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Advertiser can review own campaign" ON public.owner_reviews FOR INSERT TO authenticated WITH CHECK (advertiser_id = auth.uid());

CREATE TABLE public.control_photo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id uuid REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'validated', 'rejected', 'expired')),
  submitted_at timestamptz,
  photo_path text,
  photo_lat double precision,
  photo_lng double precision,
  photo_accuracy double precision,
  fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_validated boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.control_photo_requests TO authenticated;
GRANT ALL ON public.control_photo_requests TO service_role;
ALTER TABLE public.control_photo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers see own control requests" ON public.control_photo_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Drivers update own control requests" ON public.control_photo_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
) WITH CHECK (true);
CREATE POLICY "Admins full access control requests" ON public.control_photo_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));