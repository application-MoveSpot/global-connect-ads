-- Triggers automatiques HubSpot Sync
-- Appelle hs-sync-deal et hs-sync-contact via pg_net lors de changements en base

-- Trigger function: appelle hs-sync-deal quand une campagne change
CREATE OR REPLACE FUNCTION public.trigger_hs_sync_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/hs-sync-deal',
    body    := json_build_object('campaign_id', NEW.id::text, 'event', lower(TG_OP))::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Trigger sur campaign_requests : INSERT + UPDATE des colonnes HubSpot
DROP TRIGGER IF EXISTS on_campaign_hs_sync ON public.campaign_requests;
CREATE TRIGGER on_campaign_hs_sync
AFTER INSERT OR UPDATE OF pm_status, total_price, start_date, end_date, company, spot_name
ON public.campaign_requests
FOR EACH ROW
EXECUTE FUNCTION public.trigger_hs_sync_deal();

-- Trigger function: appelle hs-sync-contact quand un profil change
CREATE OR REPLACE FUNCTION public.trigger_hs_sync_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/hs-sync-contact',
    body    := json_build_object('user_id', NEW.user_id::text, 'event', 'upsert')::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Trigger sur advertiser_profiles
DROP TRIGGER IF EXISTS on_advertiser_profile_hs_sync ON public.advertiser_profiles;
CREATE TRIGGER on_advertiser_profile_hs_sync
AFTER INSERT OR UPDATE OF full_name, phone, company, city
ON public.advertiser_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_hs_sync_contact();

-- Trigger sur owner_profiles
DROP TRIGGER IF EXISTS on_owner_profile_hs_sync ON public.owner_profiles;
CREATE TRIGGER on_owner_profile_hs_sync
AFTER INSERT OR UPDATE OF full_name, phone, company, city
ON public.owner_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_hs_sync_contact();
