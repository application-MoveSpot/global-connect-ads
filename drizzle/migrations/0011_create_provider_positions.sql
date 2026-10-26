CREATE TABLE IF NOT EXISTS public.provider_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(user_id) ON DELETE CASCADE,
  service_quote_id uuid,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provider_positions TO authenticated;
GRANT ALL ON public.provider_positions TO service_role;

ALTER TABLE public.provider_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can read own positions"
  ON public.provider_positions FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all positions"
  ON public.provider_positions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS provider_positions_provider_time_idx
  ON public.provider_positions (provider_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS provider_positions_recorded_at_idx
  ON public.provider_positions (recorded_at DESC);