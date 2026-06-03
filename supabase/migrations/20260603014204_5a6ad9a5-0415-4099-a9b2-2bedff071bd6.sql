ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS route_zones text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS route_waypoints text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS route_pois text[] DEFAULT '{}'::text[];