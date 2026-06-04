CREATE TABLE public.vehicle_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  campaign_request_id UUID REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_positions_campaign_time ON public.vehicle_positions(campaign_request_id, recorded_at DESC);
CREATE INDEX idx_vehicle_positions_vehicle_time ON public.vehicle_positions(vehicle_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.vehicle_positions TO authenticated;
GRANT ALL ON public.vehicle_positions TO service_role;

ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can insert positions for own vehicles"
ON public.vehicle_positions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_id = auth.uid())
);

CREATE POLICY "Owners can view positions of own vehicles"
ON public.vehicle_positions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_id = auth.uid())
);

CREATE POLICY "Advertisers can view positions during campaign window"
ON public.vehicle_positions FOR SELECT TO authenticated
USING (
  campaign_request_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.campaign_requests cr
    WHERE cr.id = campaign_request_id
      AND cr.user_id = auth.uid()
      AND cr.status = 'approved'
      AND CURRENT_DATE BETWEEN cr.start_date AND cr.end_date
  )
);

CREATE POLICY "Admins can view all positions"
ON public.vehicle_positions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all positions"
ON public.vehicle_positions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_positions;
ALTER TABLE public.vehicle_positions REPLICA IDENTITY FULL;