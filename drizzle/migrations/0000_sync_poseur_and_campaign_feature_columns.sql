ALTER TABLE public.advertiser_briefs
  ADD COLUMN IF NOT EXISTS ad_format text;

ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS pose_fee_cents integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS depose_fee_cents integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS pose_installer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depose_installer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depose_photos jsonb,
  ADD COLUMN IF NOT EXISTS depose_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS depose_notes text,
  ADD COLUMN IF NOT EXISTS depose_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pose_payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS depose_payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pose_stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS depose_stripe_transfer_id text;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS license_plate text;

ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS vigilance_statut text DEFAULT 'NON_REQUIS',
  ADD COLUMN IF NOT EXISTS vigilance_gains_cumules_centimes bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vigilance_attestation_url text,
  ADD COLUMN IF NOT EXISTS vigilance_seuil_atteint_at timestamptz,
  ADD COLUMN IF NOT EXISTS vigilance_date_verification timestamptz,
  ADD COLUMN IF NOT EXISTS vigilance_notes text;

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_period_end timestamptz;

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_period_end timestamptz;

CREATE TABLE IF NOT EXISTS public.obstacle_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  obstacle_type text NOT NULL,
  description text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  reported_at timestamptz NOT NULL DEFAULT now(),
  impact_start timestamptz,
  impact_end timestamptz,
  admin_validated boolean NOT NULL DEFAULT false,
  admin_validated_at timestamptz,
  admin_notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obstacle_reports TO authenticated;
GRANT ALL ON public.obstacle_reports TO service_role;
ALTER TABLE public.obstacle_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert obstacle reports"
ON public.obstacle_reports FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.vehicles v
  JOIN public.owner_profiles op ON op.id = v.owner_id
  WHERE v.id = vehicle_id AND op.user_id = auth.uid()
));
CREATE POLICY "Owners can read obstacle reports for their vehicles"
ON public.obstacle_reports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.vehicles v
  JOIN public.owner_profiles op ON op.id = v.owner_id
  WHERE v.id = vehicle_id AND op.user_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update obstacle reports"
ON public.obstacle_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete obstacle reports"
ON public.obstacle_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS obstacle_reports_vehicle_id_idx ON public.obstacle_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS obstacle_reports_campaign_id_idx ON public.obstacle_reports(campaign_id);