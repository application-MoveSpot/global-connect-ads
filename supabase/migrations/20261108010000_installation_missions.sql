-- =============================================================================
-- INSTALLATION MISSIONS — Dissociation Pose / Dépose
-- =============================================================================
-- Architecture : chaque campagne peut avoir 0, 1 ou 2 missions indépendantes
-- (une de type 'pose', une de type 'depose'), chacune avec son propre prestataire,
-- sa localisation GPS, son workflow de statut et ses preuves photos.
--
-- Rétro-compat : les colonnes pose_installer_user_id / depose_installer_user_id
-- de campaign_requests sont maintenues. Un trigger les sync depuis installation_missions.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLE PRINCIPALE : installation_missions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.installation_missions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_request_id    UUID        NOT NULL REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  mission_type           TEXT        NOT NULL CHECK (mission_type IN ('pose', 'depose')),

  -- Prestataire assigné (payee_profiles, kind IN ('installer','both'))
  payee_id               UUID        REFERENCES public.payee_profiles(id) ON DELETE SET NULL,
  payee_user_id          UUID        REFERENCES auth.users(id)            ON DELETE SET NULL,

  -- Statut avec workflow séquentiel
  status                 TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN (
                             'pending',           -- Aucun prestataire encore
                             'dispatched',        -- Notifications envoyées aux poseurs de la zone
                             'assigned',          -- Un prestataire a accepté
                             'en_route',          -- Prestataire en route vers le lieu
                             'in_progress',       -- Sur site, mission démarrée
                             'pending_validation',-- Photos soumises, attente admin
                             'validated',         -- Admin a validé
                             'cancelled'          -- Annulée
                           )),

  -- Localisation de la mission (peut différer de la zone du véhicule)
  location_lat           DOUBLE PRECISION,
  location_lng           DOUBLE PRECISION,
  location_address       TEXT,
  location_city          TEXT,
  location_postal_code   TEXT,

  -- Géométrie PostGIS pour requêtes de proximité
  location_geom          GEOMETRY(Point, 4326)
                           GENERATED ALWAYS AS (
                             CASE
                               WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL
                               THEN ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
                               ELSE NULL
                             END
                           ) STORED,

  -- Planification
  scheduled_date         DATE,
  scheduled_time_slot    TEXT CHECK (scheduled_time_slot IN ('matin', 'apres_midi', 'journee', 'flexible')),
  accepted_at            TIMESTAMPTZ,
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,

  -- Rémunération
  fee_cents              INTEGER     NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  payout_status          TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (payout_status IN ('pending', 'processing', 'transferred', 'failed')),
  stripe_transfer_id     TEXT,
  payout_transferred_at  TIMESTAMPTZ,

  -- Notes
  provider_notes         TEXT,
  admin_notes            TEXT,
  admin_reviewed_at      TIMESTAMPTZ,
  admin_reviewed_by      UUID REFERENCES auth.users(id),

  -- Dispatch radius utilisé lors de la recherche de prestataires (km)
  dispatch_radius_km     INTEGER NOT NULL DEFAULT 30,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule mission par type par campagne
  UNIQUE (campaign_request_id, mission_type)
);

-- Index géospatial pour dispatch rapide
CREATE INDEX IF NOT EXISTS idx_installation_missions_geom
  ON public.installation_missions USING GIST (location_geom);

CREATE INDEX IF NOT EXISTS idx_installation_missions_campaign
  ON public.installation_missions (campaign_request_id, mission_type);

CREATE INDEX IF NOT EXISTS idx_installation_missions_status
  ON public.installation_missions (status, mission_type, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_installation_missions_payee
  ON public.installation_missions (payee_user_id, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLE DES PREUVES PHOTOS : mission_proofs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mission_proofs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      UUID        NOT NULL REFERENCES public.installation_missions(id) ON DELETE CASCADE,
  proof_type      TEXT        NOT NULL CHECK (proof_type IN ('avant', 'pendant', 'apres')),
  storage_path    TEXT        NOT NULL,  -- Chemin Supabase Storage
  storage_url     TEXT,                 -- URL publique signée (optionnel, cacheable)
  uploaded_by     UUID        NOT NULL REFERENCES auth.users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Metadata EXIF / enrichissement
  metadata        JSONB DEFAULT '{}',   -- { "gps_lat", "gps_lng", "taken_at", "device" }

  CONSTRAINT mission_proofs_no_duplicates UNIQUE (mission_id, proof_type, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_mission_proofs_mission
  ON public.mission_proofs (mission_id, proof_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LOG DE DISPATCH : mission_dispatch_log
--    Trace quels prestataires ont été notifiés et leur réponse
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mission_dispatch_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id       UUID        NOT NULL REFERENCES public.installation_missions(id) ON DELETE CASCADE,
  payee_id         UUID        NOT NULL REFERENCES public.payee_profiles(id),
  payee_user_id    UUID        NOT NULL REFERENCES auth.users(id),
  distance_km      NUMERIC(8,2),         -- Distance calculée lors du dispatch
  dispatched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  response         TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (response IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mission_dispatch_log_mission
  ON public.mission_dispatch_log (mission_id, response);

CREATE INDEX IF NOT EXISTS idx_mission_dispatch_log_payee
  ON public.mission_dispatch_log (payee_user_id, response);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FONCTION UTILITAIRE : trouver les poseurs à moins de X km d'un point
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_available_installers(
  p_lat          DOUBLE PRECISION,
  p_lng          DOUBLE PRECISION,
  p_radius_km    INTEGER DEFAULT 30,
  p_mission_date DATE    DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  payee_id              UUID,
  user_id               UUID,
  full_name             TEXT,
  city                  TEXT,
  phone                 TEXT,
  stripe_connect_id     TEXT,
  distance_km           NUMERIC,
  last_position_at      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.id                             AS payee_id,
    pp.user_id,
    pp.full_name,
    pp.city,
    pp.phone,
    pp.stripe_connect_account_id      AS stripe_connect_id,
    ROUND(
      ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(pos.lng, pos.lat), 4326)::geography
      ) / 1000.0
    , 1)                              AS distance_km,
    pos.recorded_at                   AS last_position_at
  FROM public.payee_profiles pp
  -- Dernière position connue
  INNER JOIN LATERAL (
    SELECT lat, lng, recorded_at
    FROM public.provider_positions
    WHERE provider_id = pp.user_id
    ORDER BY recorded_at DESC
    LIMIT 1
  ) pos ON TRUE
  WHERE
    -- Poseur certifié avec Stripe Connect opérationnel
    pp.certification_status = 'certified'
    AND pp.stripe_charges_enabled = TRUE
    AND pp.stripe_payouts_enabled = TRUE
    -- Position fraîche (< 7 jours)
    AND pos.recorded_at > now() - interval '7 days'
    -- Rayon de recherche
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(pos.lng, pos.lat), 4326)::geography,
      p_radius_km * 1000
    )
    -- Pas déjà assigné sur cette date
    AND NOT EXISTS (
      SELECT 1 FROM public.installation_missions im
      WHERE im.payee_user_id = pp.user_id
        AND im.scheduled_date = p_mission_date
        AND im.status NOT IN ('cancelled', 'validated')
    )
  ORDER BY distance_km ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.find_available_installers TO service_role, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CONTRAINTE MÉTIER : la dépose ne peut être validée avant la pose
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_enforce_pose_before_depose_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloque la validation de la dépose si la pose n'est pas encore validée
  IF NEW.status = 'validated' AND NEW.mission_type = 'depose' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.installation_missions
      WHERE campaign_request_id = NEW.campaign_request_id
        AND mission_type = 'pose'
        AND status = 'validated'
    ) THEN
      RAISE EXCEPTION 'DEPOSE_BEFORE_POSE: impossible de valider la dépose avant la pose (campaign_request_id=%).', NEW.campaign_request_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pose_before_depose_validation ON public.installation_missions;
CREATE TRIGGER trg_enforce_pose_before_depose_validation
  BEFORE UPDATE OF status ON public.installation_missions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_enforce_pose_before_depose_validation();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SYNC RÉTRO-COMPAT : mise à jour de campaign_requests depuis les missions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_sync_mission_to_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mission_type = 'pose' THEN
    UPDATE public.campaign_requests
    SET
      pose_installer_user_id = NEW.payee_user_id,
      -- Synchronise installation_status quand la pose passe en validated/pending_validation
      installation_status = CASE
        WHEN NEW.status = 'validated'           THEN 'approved'
        WHEN NEW.status = 'pending_validation'  THEN 'pending_approval'
        WHEN NEW.status = 'cancelled'           THEN installation_status  -- ne pas régresser
        ELSE installation_status
      END,
      installation_photos = COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'url', mp.storage_url,
          'path', mp.storage_path,
          'type', mp.proof_type,
          'uploaded_at', mp.uploaded_at
        ))
        FROM public.mission_proofs mp WHERE mp.mission_id = NEW.id),
        installation_photos
      ),
      updated_at = now()
    WHERE id = NEW.campaign_request_id;

  ELSIF NEW.mission_type = 'depose' THEN
    UPDATE public.campaign_requests
    SET
      depose_installer_user_id = NEW.payee_user_id,
      depose_status = CASE
        WHEN NEW.status = 'validated'           THEN 'approved'
        WHEN NEW.status = 'pending_validation'  THEN 'pending_approval'
        WHEN NEW.status = 'cancelled'           THEN depose_status
        ELSE depose_status
      END,
      depose_photos = COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'url', mp.storage_url,
          'path', mp.storage_path,
          'type', mp.proof_type,
          'uploaded_at', mp.uploaded_at
        ))
        FROM public.mission_proofs mp WHERE mp.mission_id = NEW.id),
        depose_photos
      ),
      updated_at = now()
    WHERE id = NEW.campaign_request_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mission_to_campaign ON public.installation_missions;
CREATE TRIGGER trg_sync_mission_to_campaign
  AFTER UPDATE OF status, payee_user_id ON public.installation_missions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_sync_mission_to_campaign();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ALERTE CHANGEMENT DE ZONE EN COURS DE CAMPAGNE
--    Si vehicle_positions indique que le véhicule sort de sa zone de dépose prévue,
--    on insère une alerte dans moderation_alerts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_alert_vehicle_zone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depose_mission RECORD;
  v_distance_km    NUMERIC;
  v_threshold_km   INTEGER := 50; -- Alerte si > 50 km du lieu de dépose prévu
BEGIN
  -- Cherche si ce véhicule a une mission de dépose planifiée (non encore validée)
  SELECT im.*
  INTO v_depose_mission
  FROM public.installation_missions im
  INNER JOIN public.campaign_requests cr ON cr.id = im.campaign_request_id
  WHERE cr.vehicle_id = NEW.vehicle_id
    AND im.mission_type = 'depose'
    AND im.status NOT IN ('validated', 'cancelled')
    AND im.location_lat IS NOT NULL
  LIMIT 1;

  IF FOUND THEN
    -- Calcule la distance entre la position actuelle et le lieu de dépose prévu
    v_distance_km := ST_Distance(
      ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(v_depose_mission.location_lng, v_depose_mission.location_lat), 4326)::geography
    ) / 1000.0;

    IF v_distance_km > v_threshold_km THEN
      INSERT INTO public.moderation_alerts (
        alert_type, entity_type, entity_id, details, created_at
      ) VALUES (
        'vehicle_zone_change',
        'installation_mission',
        v_depose_mission.id,
        jsonb_build_object(
          'vehicle_id',       NEW.vehicle_id,
          'current_lat',      NEW.lat,
          'current_lng',      NEW.lng,
          'depose_lat',       v_depose_mission.location_lat,
          'depose_lng',       v_depose_mission.location_lng,
          'distance_km',      v_distance_km,
          'campaign_id',      v_depose_mission.campaign_request_id,
          'mission_id',       v_depose_mission.id
        ),
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_vehicle_zone_change ON public.vehicle_positions;
CREATE TRIGGER trg_alert_vehicle_zone_change
  AFTER INSERT ON public.vehicle_positions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_alert_vehicle_zone_change();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. UPDATED_AT AUTO-REFRESH
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_installation_missions_updated_at ON public.installation_missions;
CREATE TRIGGER trg_installation_missions_updated_at
  BEFORE UPDATE ON public.installation_missions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.installation_missions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_proofs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_dispatch_log    ENABLE ROW LEVEL SECURITY;

-- installation_missions
CREATE POLICY "poseur lit ses propres missions"
  ON public.installation_missions FOR SELECT TO authenticated
  USING (payee_user_id = auth.uid());

CREATE POLICY "admin lit toutes les missions"
  ON public.installation_missions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "poseur met a jour sa mission (statut, notes, photos)"
  ON public.installation_missions FOR UPDATE TO authenticated
  USING (payee_user_id = auth.uid())
  WITH CHECK (payee_user_id = auth.uid());

CREATE POLICY "service_role full access missions"
  ON public.installation_missions TO service_role USING (true) WITH CHECK (true);

-- mission_proofs
CREATE POLICY "poseur voit ses preuves"
  ON public.mission_proofs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.installation_missions im
      WHERE im.id = mission_id AND im.payee_user_id = auth.uid()
    )
  );

CREATE POLICY "poseur insere ses preuves"
  ON public.mission_proofs FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.installation_missions im
      WHERE im.id = mission_id AND im.payee_user_id = auth.uid()
    )
  );

CREATE POLICY "admin lit toutes les preuves"
  ON public.mission_proofs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role full access proofs"
  ON public.mission_proofs TO service_role USING (true) WITH CHECK (true);

-- mission_dispatch_log (lecture seule pour les intéressés)
CREATE POLICY "poseur voit son dispatch log"
  ON public.mission_dispatch_log FOR SELECT TO authenticated
  USING (payee_user_id = auth.uid());

CREATE POLICY "admin lit tout dispatch log"
  ON public.mission_dispatch_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role full access dispatch"
  ON public.mission_dispatch_log TO service_role USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.installation_missions   TO authenticated;
GRANT SELECT, INSERT          ON public.mission_proofs          TO authenticated;
GRANT SELECT                  ON public.mission_dispatch_log    TO authenticated;
GRANT ALL                     ON public.installation_missions   TO service_role;
GRANT ALL                     ON public.mission_proofs          TO service_role;
GRANT ALL                     ON public.mission_dispatch_log    TO service_role;
