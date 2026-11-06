-- ─────────────────────────────────────────────────────────────────────────────
-- HubSpot CRM Integration
-- Syncs: advertiser_profiles + owner_profiles → HubSpot Contacts
--        campaign_requests                    → HubSpot Deals
-- Dépend de : fn_pm_call_edge (programme_manager migration)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table de suivi des synchronisations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS hs_sync_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type   text        NOT NULL
                            CHECK (object_type IN ('contact', 'deal')),
  supabase_id   text        NOT NULL,
  hubspot_id    text,
  sync_status   text        NOT NULL DEFAULT 'pending'
                            CHECK (sync_status IN ('pending', 'ok', 'error', 'deleted')),
  error_message text,
  synced_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(object_type, supabase_id)
);

CREATE INDEX IF NOT EXISTS hs_sync_log_supabase_idx ON hs_sync_log (object_type, supabase_id);
CREATE INDEX IF NOT EXISTS hs_sync_log_hubspot_idx  ON hs_sync_log (object_type, hubspot_id);

ALTER TABLE hs_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hs_sync_log_admin_all" ON hs_sync_log;
CREATE POLICY "hs_sync_log_admin_all" ON hs_sync_log
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Trigger : profil annonceur → Contact HubSpot ────────────────────────────
CREATE OR REPLACE FUNCTION fn_hs_on_advertiser_profile_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_pm_call_edge('hs-sync-contact', jsonb_build_object(
    'user_id', COALESCE(NEW.user_id, OLD.user_id),
    'event',   'upsert'
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hs_advertiser_profile_upsert ON advertiser_profiles;
CREATE TRIGGER trg_hs_advertiser_profile_upsert
  AFTER INSERT OR UPDATE OF full_name, phone, company, city ON advertiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_hs_on_advertiser_profile_upsert();

-- 3. Trigger : profil propriétaire → Contact HubSpot ─────────────────────────
CREATE OR REPLACE FUNCTION fn_hs_on_owner_profile_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_pm_call_edge('hs-sync-contact', jsonb_build_object(
    'user_id', COALESCE(NEW.user_id, OLD.user_id),
    'event',   'upsert'
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hs_owner_profile_upsert ON owner_profiles;
CREATE TRIGGER trg_hs_owner_profile_upsert
  AFTER INSERT OR UPDATE OF full_name, phone, company, city ON owner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_hs_on_owner_profile_upsert();

-- 4. Trigger : campagne → Deal HubSpot ───────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_hs_on_campaign_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
    OR OLD.pm_status    IS DISTINCT FROM NEW.pm_status
    OR OLD.status       IS DISTINCT FROM NEW.status
    OR OLD.total_price  IS DISTINCT FROM NEW.total_price
  THEN
    PERFORM fn_pm_call_edge('hs-sync-deal', jsonb_build_object(
      'campaign_id', NEW.id,
      'event', CASE
        WHEN TG_OP = 'INSERT'          THEN 'created'
        WHEN NEW.pm_status = 'completed' THEN 'won'
        WHEN NEW.status    = 'cancelled' THEN 'lost'
        ELSE 'updated'
      END
    ));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hs_campaign_upsert ON campaign_requests;
CREATE TRIGGER trg_hs_campaign_upsert
  AFTER INSERT OR UPDATE OF pm_status, status, total_price ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_hs_on_campaign_upsert();

-- 5. Vue admin : tableau de bord de synchronisation HubSpot ──────────────────
CREATE OR REPLACE VIEW hs_sync_dashboard AS
SELECT
  sl.id,
  sl.object_type,
  sl.supabase_id,
  sl.hubspot_id,
  sl.sync_status,
  sl.error_message,
  sl.synced_at,
  sl.updated_at,
  CASE sl.object_type
    WHEN 'contact' THEN (
      SELECT full_name FROM advertiser_profiles
      WHERE user_id = sl.supabase_id LIMIT 1
    )
    WHEN 'deal' THEN (
      SELECT company || ' — ' || spot_name FROM campaign_requests
      WHERE id::text = sl.supabase_id LIMIT 1
    )
  END AS label
FROM hs_sync_log sl
ORDER BY sl.updated_at DESC;
