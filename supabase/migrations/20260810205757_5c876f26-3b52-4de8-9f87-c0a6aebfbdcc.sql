CREATE TABLE public.campaign_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_request_id uuid NOT NULL REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  distance_traveled_m double precision NOT NULL DEFAULT 0,
  distance_traveled_in_zone_m double precision NOT NULL DEFAULT 0,
  active_minutes integer NOT NULL DEFAULT 0,
  points_total integer NOT NULL DEFAULT 0,
  points_in_zone integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_request_id, day)
);

GRANT SELECT ON public.campaign_metrics TO authenticated;
GRANT ALL ON public.campaign_metrics TO service_role;

ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own campaign metrics"
ON public.campaign_metrics FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaign_requests cr
  WHERE cr.id = campaign_metrics.campaign_request_id
    AND cr.user_id = auth.uid()
));

CREATE POLICY "Owners read metrics of their vehicles"
ON public.campaign_metrics FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaign_requests cr
  JOIN public.vehicles v ON v.id = cr.vehicle_id
  JOIN public.owner_profiles op ON op.id = v.owner_id
  WHERE cr.id = campaign_metrics.campaign_request_id
    AND op.user_id = auth.uid()
));

CREATE POLICY "Admins read all campaign metrics"
ON public.campaign_metrics FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER campaign_metrics_updated_at
BEFORE UPDATE ON public.campaign_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_campaign_gps_batch(p_campaign_id uuid, p_points jsonb)
RETURNS TABLE(points_total integer, points_in_zone integer, distance_in_zone_m double precision, active_minutes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_zone extensions.geometry;
  v_total integer := 0;
  v_in_zone integer := 0;
  v_dist double precision := 0;
  v_dist_zone double precision := 0;
  v_minutes integer := 0;
  v_prev extensions.geometry;
  v_prev_in boolean;
  v_prev_ts timestamptz;
  v_first_ts timestamptz;
  v_last_ts timestamptz;
  r record;
  v_pt extensions.geometry;
  v_inside boolean;
  v_seg double precision;
BEGIN
  IF p_campaign_id IS NULL OR p_points IS NULL THEN
    RETURN;
  END IF;

  SELECT cr.zone_polygon INTO v_zone FROM public.campaign_requests cr WHERE cr.id = p_campaign_id;

  FOR r IN
    SELECT (e->>'lat')::double precision AS lat,
           (e->>'lng')::double precision AS lng,
           COALESCE((e->>'recordedAt')::timestamptz, now()) AS ts
    FROM jsonb_array_elements(p_points) e
    ORDER BY COALESCE((e->>'recordedAt')::timestamptz, now())
  LOOP
    v_total := v_total + 1;
    v_pt := extensions.ST_SetSRID(extensions.ST_MakePoint(r.lng, r.lat), 4326);
    v_inside := CASE WHEN v_zone IS NULL THEN TRUE ELSE extensions.ST_Contains(v_zone, v_pt) END;
    IF v_inside THEN v_in_zone := v_in_zone + 1; END IF;

    IF v_prev IS NOT NULL THEN
      v_seg := extensions.ST_Distance(v_prev::extensions.geography, v_pt::extensions.geography);
      -- ignore jumps > 5 km between two consecutive points (GPS glitch)
      IF v_seg <= 5000 THEN
        v_dist := v_dist + v_seg;
        IF v_inside AND v_prev_in THEN
          v_dist_zone := v_dist_zone + v_seg;
        ELSIF v_inside OR v_prev_in THEN
          v_dist_zone := v_dist_zone + (v_seg / 2);
        END IF;
      END IF;
    END IF;

    IF v_first_ts IS NULL THEN v_first_ts := r.ts; END IF;
    v_last_ts := r.ts;
    v_prev := v_pt;
    v_prev_in := v_inside;
    v_prev_ts := r.ts;
  END LOOP;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  v_minutes := GREATEST(0, LEAST(1440, CEIL(EXTRACT(EPOCH FROM (v_last_ts - v_first_ts)) / 60.0)::integer));

  INSERT INTO public.campaign_metrics AS cm (
    campaign_request_id, day, distance_traveled_m, distance_traveled_in_zone_m,
    active_minutes, points_total, points_in_zone
  ) VALUES (
    p_campaign_id, (v_last_ts AT TIME ZONE 'UTC')::date, v_dist, v_dist_zone,
    v_minutes, v_total, v_in_zone
  )
  ON CONFLICT (campaign_request_id, day) DO UPDATE SET
    distance_traveled_m = cm.distance_traveled_m + EXCLUDED.distance_traveled_m,
    distance_traveled_in_zone_m = cm.distance_traveled_in_zone_m + EXCLUDED.distance_traveled_in_zone_m,
    active_minutes = LEAST(1440, cm.active_minutes + EXCLUDED.active_minutes),
    points_total = cm.points_total + EXCLUDED.points_total,
    points_in_zone = cm.points_in_zone + EXCLUDED.points_in_zone,
    updated_at = now();

  RETURN QUERY SELECT v_total, v_in_zone, v_dist_zone, v_minutes;
END;
$$;

REVOKE ALL ON FUNCTION public.record_campaign_gps_batch(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_campaign_gps_batch(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.record_campaign_gps_batch(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_campaign_gps_batch(uuid, jsonb) TO service_role;