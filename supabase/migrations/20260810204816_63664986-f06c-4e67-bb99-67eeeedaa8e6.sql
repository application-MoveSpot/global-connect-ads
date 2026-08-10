CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE public.advertiser_briefs
  ADD COLUMN IF NOT EXISTS zone_polygon extensions.geometry(Polygon, 4326),
  ADD COLUMN IF NOT EXISTS zone_area_km2 numeric;

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS zone_polygon extensions.geometry(Polygon, 4326),
  ADD COLUMN IF NOT EXISTS zone_area_km2 numeric;

CREATE INDEX IF NOT EXISTS advertiser_briefs_zone_polygon_gix
  ON public.advertiser_briefs USING gist (zone_polygon);
CREATE INDEX IF NOT EXISTS campaign_requests_zone_polygon_gix
  ON public.campaign_requests USING gist (zone_polygon);

CREATE OR REPLACE FUNCTION public.is_point_in_campaign_zone(
  p_campaign_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN cr.zone_polygon IS NULL THEN NULL
    ELSE extensions.ST_Contains(
      cr.zone_polygon,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)
    )
  END
  FROM public.campaign_requests cr
  WHERE cr.id = p_campaign_id
$$;

REVOKE ALL ON FUNCTION public.is_point_in_campaign_zone(uuid, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_point_in_campaign_zone(uuid, double precision, double precision) TO service_role;