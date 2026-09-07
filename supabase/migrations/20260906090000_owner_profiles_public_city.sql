-- Allow anonymous users to read the city of owners who have at least one approved vehicle.
-- This is needed for the public fleet map on the homepage (MobilityMap, AdSpots).
-- Only the `city` column is exposed — no personal data (name, phone, email, etc.).

-- 1. Grant table-level SELECT to anon (RLS still filters rows)
GRANT SELECT ON public.owner_profiles TO anon;

-- 2. RLS policy: anon can only read owner_profiles where the owner has an approved vehicle
CREATE POLICY "Public can view city of owners with approved vehicles"
  ON public.owner_profiles
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.owner_id = owner_profiles.id
        AND v.status = 'approved'
    )
  );
