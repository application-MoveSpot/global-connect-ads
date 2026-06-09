ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.advertiser_profiles
  DROP CONSTRAINT IF EXISTS advertiser_profiles_account_type_check;
ALTER TABLE public.advertiser_profiles
  ADD CONSTRAINT advertiser_profiles_account_type_check
  CHECK (account_type IN ('business','individual'));

CREATE OR REPLACE FUNCTION public.validate_advertiser_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type = 'business' THEN
    IF NEW.siret IS NULL OR length(trim(NEW.siret)) = 0 THEN
      RAISE EXCEPTION 'SIRET requis pour un compte entreprise/association';
    END IF;
  ELSIF NEW.account_type = 'individual' THEN
    IF NEW.address IS NULL OR length(trim(NEW.address)) < 5 THEN
      RAISE EXCEPTION 'Adresse postale requise pour un compte particulier';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_advertiser_profile_trigger ON public.advertiser_profiles;
CREATE TRIGGER validate_advertiser_profile_trigger
  BEFORE INSERT OR UPDATE ON public.advertiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_advertiser_profile();