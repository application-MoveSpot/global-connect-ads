-- Add missing columns to partner_profiles for the commercial partner flow.
-- These columns are required by the /partner and /partner/inscription pages;
-- their absence caused every profile query to return a 400 error, which
-- triggered a navigation loop between the two pages ("vibrations").
ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_period_end timestamptz;
