ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS ad_format text;

COMMENT ON COLUMN public.campaign_requests.ad_format
  IS 'Format publicitaire du spot réservé (ex: covering, sticker, totem, lcd) — copié depuis vehicles.format au moment de la réservation.';
