ALTER TABLE public.obstacle_reports
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.service_quotes
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS impossible_reason text,
  ADD COLUMN IF NOT EXISTS impossible_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS impossible_at timestamptz;

CREATE INDEX IF NOT EXISTS service_quotes_vehicle_id_idx ON public.service_quotes(vehicle_id);