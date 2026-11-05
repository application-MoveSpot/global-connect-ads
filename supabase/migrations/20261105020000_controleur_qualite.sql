-- ─────────────────────────────────────────────────────────────────────────────
-- Contrôleur Qualité (CQ) — programme autonome validation photos & anti-fraude
-- Dépend de : control_photo_requests, campaign_requests, vehicle_positions,
--             driver_trust_scores, driver_fraud_scores, gps_fraud_alerts
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne cq_status sur control_photo_requests ────────────────────────────
ALTER TABLE control_photo_requests
  ADD COLUMN IF NOT EXISTS cq_status text NOT NULL DEFAULT 'pending'
  CHECK (cq_status IN (
    'pending',
    'auto_validated',
    'needs_human_review',
    'rejected_fraud',
    'rejected_timeout'
  ));

ALTER TABLE control_photo_requests
  ADD COLUMN IF NOT EXISTS cq_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS cq_fraud_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_type text
  CHECK (photo_type IN ('installation','depose','control'));

CREATE INDEX IF NOT EXISTS cq_photo_status_idx ON control_photo_requests (cq_status, created_at) WHERE cq_status = 'pending';

-- 2. Table cq_jobs : file de travaux CQ ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cq_jobs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type             text        NOT NULL
                                   CHECK (job_type IN (
                                     'validate_photo',
                                     'analyze_gps',
                                     'update_trust'
                                   )),
  campaign_request_id  uuid        REFERENCES campaign_requests(id) ON DELETE CASCADE,
  driver_id            uuid        REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id           uuid        REFERENCES vehicles(id) ON DELETE CASCADE,
  photo_request_id     uuid        REFERENCES control_photo_requests(id) ON DELETE CASCADE,
  payload              jsonb       NOT NULL DEFAULT '{}',
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','processing','done','error')),
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  processed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS cq_jobs_status_idx ON cq_jobs (status, created_at) WHERE status = 'pending';

ALTER TABLE cq_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cq_jobs_admin_all" ON cq_jobs;
CREATE POLICY "cq_jobs_admin_all" ON cq_jobs
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Trigger : soumission d'une photo → CQ validate ──────────────────────────
CREATE OR REPLACE FUNCTION fn_cq_on_photo_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'submitted' AND NEW.status = 'submitted' THEN

    INSERT INTO cq_jobs (job_type, campaign_request_id, driver_id, vehicle_id, photo_request_id, payload)
    VALUES (
      'validate_photo',
      NEW.campaign_request_id,
      NEW.driver_id,
      NEW.vehicle_id,
      NEW.id,
      jsonb_build_object(
        'photo_path',     NEW.photo_path,
        'photo_lat',      NEW.photo_lat,
        'photo_lng',      NEW.photo_lng,
        'photo_accuracy', NEW.photo_accuracy,
        'photo_type',     COALESCE(NEW.photo_type, 'control'),
        'submitted_at',   NEW.submitted_at
      )
    );

    PERFORM fn_pm_call_edge('cq-validate-photo', jsonb_build_object(
      'photo_request_id', NEW.id,
      'campaign_id',      NEW.campaign_request_id
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cq_photo_submitted ON control_photo_requests;
CREATE TRIGGER trg_cq_photo_submitted
  AFTER UPDATE ON control_photo_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_cq_on_photo_submitted();

-- 4. Trigger : photos installation/dépose soumises via campaign_requests ─────
CREATE OR REPLACE FUNCTION fn_cq_on_campaign_photos_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Photos d'installation soumises
  IF OLD.installation_photos IS DISTINCT FROM NEW.installation_photos
     AND NEW.installation_photos IS NOT NULL
     AND jsonb_array_length(NEW.installation_photos) > 0
     AND (OLD.installation_photos IS NULL OR jsonb_array_length(OLD.installation_photos) = 0) THEN

    PERFORM fn_pm_call_edge('cq-validate-photo', jsonb_build_object(
      'campaign_id',  NEW.id,
      'photo_type',   'installation',
      'photos',       NEW.installation_photos
    ));
  END IF;

  -- Photos de dépose soumises
  IF OLD.depose_photos IS DISTINCT FROM NEW.depose_photos
     AND NEW.depose_photos IS NOT NULL
     AND jsonb_array_length(NEW.depose_photos) > 0
     AND (OLD.depose_photos IS NULL OR jsonb_array_length(OLD.depose_photos) = 0) THEN

    PERFORM fn_pm_call_edge('cq-validate-photo', jsonb_build_object(
      'campaign_id',  NEW.id,
      'photo_type',   'depose',
      'photos',       NEW.depose_photos
    ));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cq_campaign_photos ON campaign_requests;
CREATE TRIGGER trg_cq_campaign_photos
  AFTER UPDATE ON campaign_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_cq_on_campaign_photos_updated();

-- 5. Trigger : nouvelle position GPS → détecter anomalies ────────────────────
CREATE OR REPLACE FUNCTION fn_cq_on_gps_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev RECORD;
  v_elapsed_s   numeric;
  v_distance_m  numeric;
  v_speed_kmh   numeric;
BEGIN
  -- Trouver la position précédente pour ce véhicule/campagne
  SELECT lat, lng, recorded_at
    INTO v_prev
  FROM vehicle_positions
  WHERE vehicle_id = NEW.vehicle_id
    AND campaign_request_id = NEW.campaign_request_id
    AND recorded_at < NEW.recorded_at
  ORDER BY recorded_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_elapsed_s := EXTRACT(EPOCH FROM (NEW.recorded_at - v_prev.recorded_at));

  IF v_elapsed_s <= 0 OR v_elapsed_s > 3600 THEN
    RETURN NEW; -- Trop court ou trop long pour être fiable
  END IF;

  -- Distance Haversine approchée (en mètres)
  v_distance_m := 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(NEW.lat - v_prev.lat) / 2), 2)
    + COS(RADIANS(v_prev.lat)) * COS(RADIANS(NEW.lat))
      * POWER(SIN(RADIANS(NEW.lng - v_prev.lng) / 2), 2)
  ));

  v_speed_kmh := (v_distance_m / v_elapsed_s) * 3.6;

  -- Alerte si vitesse > 180 km/h (impossible pour un véhicule publicitaire)
  IF v_speed_kmh > 180 THEN
    INSERT INTO gps_fraud_alerts (
      vehicle_id, driver_id, alert_type, severity,
      detected_at, campaign_request_id,
      point_a, point_b,
      computed_speed_kmh, distance_m, elapsed_s,
      fraud_score, resolved
    ) VALUES (
      NEW.vehicle_id,
      NULL,
      'impossible_speed',
      CASE WHEN v_speed_kmh > 500 THEN 'critical' WHEN v_speed_kmh > 300 THEN 'high' ELSE 'medium' END,
      NEW.recorded_at,
      NEW.campaign_request_id,
      jsonb_build_object('lat', v_prev.lat, 'lng', v_prev.lng, 'at', v_prev.recorded_at),
      jsonb_build_object('lat', NEW.lat, 'lng', NEW.lng, 'at', NEW.recorded_at),
      ROUND(v_speed_kmh::numeric, 1),
      ROUND(v_distance_m::numeric, 0),
      ROUND(v_elapsed_s::numeric, 0),
      LEAST(100, GREATEST(10, (v_speed_kmh / 10)::integer)),
      false
    )
    ON CONFLICT DO NOTHING;

    -- Mettre à jour fraud score driver (best-effort)
    UPDATE driver_fraud_scores
    SET
      score       = LEAST(100, score + LEAST(30, (v_speed_kmh / 20)::integer)),
      total_alerts = total_alerts + 1,
      last_alert_at = now(),
      updated_at  = now()
    WHERE driver_id = (
      SELECT user_id FROM drivers WHERE id = NEW.vehicle_id LIMIT 1
    );
  END IF;

  -- Détecter position nulle (spoofing 0,0)
  IF ABS(NEW.lat) < 0.001 AND ABS(NEW.lng) < 0.001 THEN
    INSERT INTO gps_fraud_alerts (
      vehicle_id, alert_type, severity, detected_at, campaign_request_id,
      point_a, point_b, fraud_score, resolved
    ) VALUES (
      NEW.vehicle_id, 'null_island_spoof', 'high', NEW.recorded_at,
      NEW.campaign_request_id,
      jsonb_build_object('lat', NEW.lat, 'lng', NEW.lng),
      jsonb_build_object('lat', NEW.lat, 'lng', NEW.lng),
      80, false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cq_gps_position ON vehicle_positions;
CREATE TRIGGER trg_cq_gps_position
  AFTER INSERT ON vehicle_positions
  FOR EACH ROW
  EXECUTE FUNCTION fn_cq_on_gps_position();

-- 6. Fonction utilitaire : recalculer trust score ────────────────────────────
CREATE OR REPLACE FUNCTION fn_cq_recompute_trust(p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total      integer := 0;
  v_ok         integer := 0;
  v_expired    integer := 0;
  v_rejected   integer := 0;
  v_gps_flags  integer := 0;
  v_score      integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE cq_status = 'auto_validated' OR admin_validated = true),
    COUNT(*) FILTER (WHERE status = 'expired'),
    COUNT(*) FILTER (WHERE cq_status = 'rejected_fraud')
  INTO v_total, v_ok, v_expired, v_rejected
  FROM control_photo_requests
  WHERE driver_id = p_driver_id;

  SELECT COUNT(*) INTO v_gps_flags
  FROM gps_fraud_alerts gfa
  JOIN vehicles v ON v.id = gfa.vehicle_id
  WHERE v.owner_id = p_driver_id AND NOT gfa.resolved;

  -- Score composite 0-100
  v_score := GREATEST(0, LEAST(100,
    100
    - (v_rejected * 20)
    - (v_expired * 5)
    - (v_gps_flags * 10)
    + CASE WHEN v_total > 0 THEN (v_ok * 10 / v_total) ELSE 0 END
  ));

  INSERT INTO driver_trust_scores (
    driver_id, score,
    control_requests_total, control_requests_ok,
    control_requests_expired, control_requests_rejected,
    gps_anomaly_flags,
    last_updated_at
  ) VALUES (
    p_driver_id, v_score,
    v_total, v_ok, v_expired, v_rejected,
    v_gps_flags,
    now()
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    score                    = EXCLUDED.score,
    control_requests_total   = EXCLUDED.control_requests_total,
    control_requests_ok      = EXCLUDED.control_requests_ok,
    control_requests_expired = EXCLUDED.control_requests_expired,
    control_requests_rejected= EXCLUDED.control_requests_rejected,
    gps_anomaly_flags        = EXCLUDED.gps_anomaly_flags,
    last_updated_at          = now();
END;
$$;

-- 7. Vue admin : tableau de bord CQ ──────────────────────────────────────────
CREATE OR REPLACE VIEW cq_dashboard AS
SELECT
  d.id                                              AS driver_id,
  d.full_name,
  d.user_id,
  COALESCE(ts.score, 100)                           AS trust_score,
  COALESCE(ts.control_requests_total, 0)            AS controls_total,
  COALESCE(ts.control_requests_ok, 0)               AS controls_ok,
  COALESCE(ts.gps_anomaly_flags, 0)                 AS gps_flags,
  COALESCE(fs.total_alerts, 0)                      AS fraud_alerts,
  COALESCE(fs.score, 0)                             AS fraud_score,
  (SELECT COUNT(*) FROM control_photo_requests cpr
   WHERE cpr.driver_id = d.id AND cpr.cq_status = 'needs_human_review') AS pending_reviews,
  (SELECT COUNT(*) FROM gps_fraud_alerts gfa
   JOIN vehicles v ON v.id = gfa.vehicle_id
   WHERE v.owner_id = d.user_id AND NOT gfa.resolved)                   AS open_gps_alerts
FROM drivers d
LEFT JOIN driver_trust_scores ts ON ts.driver_id = d.id
LEFT JOIN driver_fraud_scores fs ON fs.driver_id = d.id;

-- 8. pg_cron : CQ GPS analyse quotidienne ────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('cq-gps-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'cq-gps-daily',
  '0 2 * * *',
  $$SELECT fn_pm_call_edge('cq-analyze-gps', '{"trigger":"cron"}'::jsonb);$$
);
