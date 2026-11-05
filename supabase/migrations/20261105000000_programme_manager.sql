-- ─────────────────────────────────────────────────────────────────────────────
-- Programme Manager (PM) — orchestrateur autonome du cycle de vie des campagnes
-- Dépend de : campaign_requests, vehicles, vehicle_positions (PostGIS, pg_net, pg_cron)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne pm_status sur campaign_requests ─────────────────────────────────
ALTER TABLE campaign_requests
  ADD COLUMN IF NOT EXISTS pm_status text NOT NULL DEFAULT 'idle'
  CHECK (pm_status IN (
    'idle',
    'awaiting_installation',
    'active',
    'completing',
    'completed',
    'incident'
  ));

-- 2. Table pm_jobs : file de travaux async du PM ─────────────────────────────
CREATE TABLE IF NOT EXISTS pm_jobs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id uuid        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  job_type            text        NOT NULL
                                  CHECK (job_type IN (
                                    'payment_confirmed',
                                    'installation_validated',
                                    'campaign_start',
                                    'campaign_end',
                                    'depose_validated',
                                    'coverage_check',
                                    'incident_detected'
                                  )),
  payload             jsonb       NOT NULL DEFAULT '{}',
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','processing','done','error')),
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS pm_jobs_campaign_idx ON pm_jobs (campaign_request_id);
CREATE INDEX IF NOT EXISTS pm_jobs_status_idx   ON pm_jobs (status, created_at) WHERE status = 'pending';

-- RLS : admins en lecture/écriture, service_role bypass auto
ALTER TABLE pm_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_jobs_admin_all" ON pm_jobs;
CREATE POLICY "pm_jobs_admin_all" ON pm_jobs
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Table pm_coverage_snapshots : suivi de couverture GPS ───────────────────
CREATE TABLE IF NOT EXISTS pm_coverage_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id uuid        NOT NULL REFERENCES campaign_requests(id) ON DELETE CASCADE,
  snapshot_date       date        NOT NULL,
  coverage_rate       numeric(5,2) NOT NULL DEFAULT 0,
  positions_count     integer     NOT NULL DEFAULT 0,
  zone_intersect_pct  numeric(5,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_request_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS pm_cov_campaign_date_idx
  ON pm_coverage_snapshots (campaign_request_id, snapshot_date DESC);

ALTER TABLE pm_coverage_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_cov_admin_select" ON pm_coverage_snapshots;
CREATE POLICY "pm_cov_admin_select" ON pm_coverage_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Fonction utilitaire : appel async vers une Edge Function ────────────────
CREATE OR REPLACE FUNCTION fn_pm_call_edge(
  p_function_name text,
  p_body          jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := p_body::text,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- jamais bloquer
END;
$$;

-- 5. Trigger : paiement confirmé → PM lifecycle ──────────────────────────────
CREATE OR REPLACE FUNCTION fn_pm_on_payment_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Paiement vient d'être validé
  IF OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.payment_status = 'paid' THEN
    -- Mettre à jour pm_status
    UPDATE campaign_requests
       SET pm_status = 'awaiting_installation'
     WHERE id = NEW.id;

    -- Enregistrer le job PM
    INSERT INTO pm_jobs (campaign_request_id, job_type, payload)
    VALUES (
      NEW.id,
      'payment_confirmed',
      jsonb_build_object(
        'campaign_id', NEW.id,
        'paid_amount_cents', NEW.paid_amount_cents,
        'vehicle_id', NEW.vehicle_id
      )
    );

    -- Appel async Edge Function
    PERFORM fn_pm_call_edge('pm-lifecycle', jsonb_build_object(
      'campaign_id', NEW.id,
      'event',       'payment_confirmed'
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_payment_confirmed ON campaign_requests;
CREATE TRIGGER trg_pm_payment_confirmed
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_pm_on_payment_confirmed();

-- 6. Trigger : installation validée → PM lifecycle ───────────────────────────
CREATE OR REPLACE FUNCTION fn_pm_on_installation_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.installation_status IS DISTINCT FROM 'approved'
     AND NEW.installation_status = 'approved' THEN

    UPDATE campaign_requests
       SET pm_status = 'active'
     WHERE id = NEW.id;

    INSERT INTO pm_jobs (campaign_request_id, job_type, payload)
    VALUES (
      NEW.id,
      'installation_validated',
      jsonb_build_object('campaign_id', NEW.id)
    );

    PERFORM fn_pm_call_edge('pm-lifecycle', jsonb_build_object(
      'campaign_id', NEW.id,
      'event',       'installation_validated'
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_installation_validated ON campaign_requests;
CREATE TRIGGER trg_pm_installation_validated
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_pm_on_installation_validated();

-- 7. Trigger : dépose validée → PM lifecycle ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_pm_on_depose_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.depose_status IS DISTINCT FROM 'approved'
     AND NEW.depose_status = 'approved' THEN

    UPDATE campaign_requests
       SET pm_status = 'completed'
     WHERE id = NEW.id;

    INSERT INTO pm_jobs (campaign_request_id, job_type, payload)
    VALUES (
      NEW.id,
      'depose_validated',
      jsonb_build_object('campaign_id', NEW.id)
    );

    PERFORM fn_pm_call_edge('pm-lifecycle', jsonb_build_object(
      'campaign_id', NEW.id,
      'event',       'depose_validated'
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_depose_validated ON campaign_requests;
CREATE TRIGGER trg_pm_depose_validated
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_pm_on_depose_validated();

-- 8. RPC : correspondance véhicule/brief par zone PostGIS ────────────────────
CREATE OR REPLACE FUNCTION pm_find_matching_vehicles(
  p_brief_id      uuid,
  p_max_results   int DEFAULT 20
)
RETURNS TABLE (
  vehicle_id       uuid,
  owner_id         uuid,
  score            numeric,
  geo_overlap_pct  numeric,
  price_per_day    numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone_polygon  geometry;
  v_vehicle_types text[];
  v_budget_max    numeric;
BEGIN
  SELECT b.zone_polygon, b.vehicle_types, b.budget_max
    INTO v_zone_polygon, v_vehicle_types, v_budget_max
  FROM advertiser_briefs b
  WHERE b.id = p_brief_id;

  IF v_zone_polygon IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.id                                   AS vehicle_id,
    v.owner_id,
    -- Score composite (PostGIS + type + budget)
    ROUND(
      CASE
        WHEN v_zone_polygon IS NOT NULL AND v.covering_zone IS NOT NULL
        THEN
          0.6 * LEAST(1.0,
            ST_Area(
              ST_Intersection(
                v_zone_polygon,
                ST_GeomFromGeoJSON(v.covering_zone::text)
              )
            ) / NULLIF(ST_Area(v_zone_polygon), 0)
          )
        ELSE 0.3
      END
      + 0.3 * CASE WHEN v.price_per_day <= COALESCE(v_budget_max, v.price_per_day * 1.5) THEN 1 ELSE 0.3 END
      + 0.1 * CASE WHEN v.status::text = 'active' THEN 1 ELSE 0 END,
      4
    )::numeric                             AS score,
    ROUND(
      CASE
        WHEN v_zone_polygon IS NOT NULL AND v.covering_zone IS NOT NULL
        THEN LEAST(100,
          100.0 * ST_Area(
            ST_Intersection(
              v_zone_polygon,
              ST_GeomFromGeoJSON(v.covering_zone::text)
            )
          ) / NULLIF(ST_Area(v_zone_polygon), 0)
        )
        ELSE 0
      END,
      1
    )::numeric                             AS geo_overlap_pct,
    v.price_per_day
  FROM vehicles v
  WHERE v.status::text = 'active'
    AND (
      v_vehicle_types IS NULL
      OR v_vehicle_types = '{}'
      OR v.type::text = ANY(v_vehicle_types)
    )
  ORDER BY score DESC, v.price_per_day ASC
  LIMIT p_max_results;

EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- 9. RPC : taux de couverture GPS d'une campagne active ──────────────────────
CREATE OR REPLACE FUNCTION pm_calc_coverage_rate(
  p_campaign_id  uuid,
  p_date         date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone_polygon geometry;
  v_positions    bigint;
  v_in_zone      bigint;
BEGIN
  SELECT zone_polygon INTO v_zone_polygon
  FROM campaign_requests
  WHERE id = p_campaign_id;

  IF v_zone_polygon IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE ST_Within(
        ST_SetSRID(ST_MakePoint(vp.lng, vp.lat), 4326),
        v_zone_polygon
      )
    )
  INTO v_positions, v_in_zone
  FROM vehicle_positions vp
  WHERE vp.campaign_request_id = p_campaign_id
    AND vp.recorded_at::date = p_date;

  IF v_positions = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(100.0 * v_in_zone / v_positions, 2);
END;
$$;

-- 10. pg_cron : pm-monitor toutes les heures ─────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('pm-monitor-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'pm-monitor-hourly',
  '0 * * * *',
  $$SELECT fn_pm_call_edge('pm-monitor', '{"trigger":"cron"}'::jsonb);$$
);
