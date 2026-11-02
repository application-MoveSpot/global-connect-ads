-- Security hardening tables for MoveSpot anti-fraud system.
-- Covers GPS spoofing detection, device integrity tracking, and fraud event logging.

-- ─── GPS Fraud Alerts ────────────────────────────────────────────────────────
-- Stocke les anomalies détectées sur les traces GPS des conducteurs.
-- Alimente le dashboard admin et déclenche les suspensions automatiques.

CREATE TABLE public.gps_fraud_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  alert_type    TEXT NOT NULL CHECK (alert_type IN (
                  'mock_location',     -- FLAG_MOCK_LOCATION détecté côté mobile
                  'impossible_speed',  -- vitesse > 200 km/h sur 2 points consécutifs
                  'teleportation',     -- saut géographique irréaliste (> 5km en < 30s)
                  'altitude_anomaly',  -- altitude incohérente avec la route
                  'static_spoofing',   -- coordonnées identiques répétées > 5 min
                  'provider_mismatch'  -- GPS provider != hardware GPS
                )),
  severity      TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Points GPS incriminés pour audit
  point_a       JSONB,   -- { lat, lng, speed, recorded_at }
  point_b       JSONB,   -- point suivant ayant déclenché l'alerte
  computed_speed_kmh NUMERIC,
  distance_m    NUMERIC,
  elapsed_s     NUMERIC,
  -- Contexte
  campaign_request_id UUID REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  fraud_score   INTEGER DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100),
  resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES auth.users(id),
  notes         TEXT
);

CREATE INDEX gps_fraud_alerts_vehicle_idx ON public.gps_fraud_alerts(vehicle_id, detected_at DESC);
CREATE INDEX gps_fraud_alerts_unresolved  ON public.gps_fraud_alerts(resolved) WHERE resolved = false;

-- ─── Device Integrity Log ─────────────────────────────────────────────────────
-- Journal des vérifications d'intégrité envoyées depuis l'app mobile.
-- Un device rooté/jailbreaké doit déclencher la restriction du wallet.

CREATE TABLE public.device_integrity_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,        -- identifiant stable (Android ANDROID_ID)
  platform        TEXT CHECK (platform IN ('ios', 'android')),
  is_rooted       BOOLEAN NOT NULL DEFAULT false,
  is_emulator     BOOLEAN NOT NULL DEFAULT false,
  is_mock_enabled BOOLEAN NOT NULL DEFAULT false,  -- Developer options GPS mock activé
  play_integrity_verdict TEXT,   -- MEETS_DEVICE_INTEGRITY | MEETS_BASIC_INTEGRITY | FAILED
  attestation_raw JSONB,         -- payload brut Play Integrity / DeviceCheck
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Si true, le wallet est gelé jusqu'à validation manuelle admin
  wallet_frozen   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX device_integrity_user_idx ON public.device_integrity_checks(user_id, checked_at DESC);

-- ─── Fraud Score History ─────────────────────────────────────────────────────
-- Score cumulatif par conducteur. Seuil > 70 → suspension automatique.

CREATE TABLE public.driver_fraud_scores (
  driver_id     UUID PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  total_alerts  INTEGER NOT NULL DEFAULT 0,
  last_alert_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'clean' CHECK (status IN ('clean', 'warned', 'suspended', 'banned')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger : recalcule le statut automatiquement selon le score
CREATE OR REPLACE FUNCTION update_driver_fraud_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.score >= 80 THEN 'suspended'
    WHEN NEW.score >= 50 THEN 'warned'
    ELSE 'clean'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER driver_fraud_status_trigger
  BEFORE UPDATE ON public.driver_fraud_scores
  FOR EACH ROW EXECUTE FUNCTION update_driver_fraud_status();

-- ─── Grants & RLS ─────────────────────────────────────────────────────────────

GRANT SELECT ON public.gps_fraud_alerts TO authenticated;
GRANT SELECT ON public.device_integrity_checks TO authenticated;
GRANT SELECT ON public.driver_fraud_scores TO authenticated;
GRANT INSERT ON public.device_integrity_checks TO authenticated;
GRANT ALL ON public.gps_fraud_alerts, public.device_integrity_checks, public.driver_fraud_scores TO service_role;

ALTER TABLE public.gps_fraud_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_integrity_checks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_fraud_scores       ENABLE ROW LEVEL SECURITY;

-- Admins voient tout
CREATE POLICY "admin_full_access_gps_alerts" ON public.gps_fraud_alerts
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access_device_checks" ON public.device_integrity_checks
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access_fraud_scores" ON public.driver_fraud_scores
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- Conducteurs : insert uniquement leur propre check d'intégrité
CREATE POLICY "user_insert_own_device_check" ON public.device_integrity_checks
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Owners : lisent les alertes de leurs véhicules
CREATE POLICY "owner_read_own_gps_alerts" ON public.gps_fraud_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id AND op.user_id = auth.uid()
    )
  );
