-- =============================================================================
-- Migration : constat contradictoire vinyle — extension incident_reports
-- =============================================================================
-- Ajoute les colonnes nécessaires au flux complet :
--   1. Photos du propriétaire (tableau, min 2 requis côté application)
--   2. Colonne installer_id  (poseur assigné via service_quotes)
--   3. Photos de confirmation du poseur (tableau, min 2 requis)
--   4. Diagnostic du poseur (enum)
--   5. Notes libres du poseur
--   6. Horodatage de confirmation
--
-- Évolution du cycle de vie (status) :
--   open                   → état initial, inchangé
--   reported_by_owner      → propriétaire a soumis ≥ 2 photos ; campagne mise en pause
--   confirmed_by_installer → poseur a confirmé avec ≥ 2 photos + diagnostic
--   resolved_reprint       → admin ordonne la repose gratuite
--   resolved_rejected      → admin rejette la réclamation
--   in_progress / closed   → statuts historiques conservés pour compatibilité
-- =============================================================================

-- ── 1. Nouvelles colonnes ────────────────────────────────────────────────────

ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS owner_report_photos   text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installer_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installer_confirmation_photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installer_diagnosis   text
    CHECK (installer_diagnosis IN (
      'installation_defect', -- défaut de pose imputable au poseur
      'material_defect',     -- défaut matière (vinyle)
      'owner_misuse',        -- mauvais usage par le propriétaire / chauffeur
      'external_damage'      -- dommage extérieur (accident, vandalisme)
    )),
  ADD COLUMN IF NOT EXISTS installer_notes       text,
  ADD COLUMN IF NOT EXISTS installer_confirmed_at timestamptz;

-- ── 2. CHECK sur status : accepter les nouveaux états ───────────────────────
--    Remplace la contrainte existante (conserve les anciens pour compatibilité)

ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_status_check;

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_status_check
    CHECK (status IN (
      'open',
      'reported_by_owner',
      'confirmed_by_installer',
      'resolved_reprint',
      'resolved_rejected',
      'in_progress',
      'closed'
    ));

-- ── 3. RLS : poseur peut lire et mettre à jour ses incidents assignés ────────

-- Lecture : poseur assigné peut voir les incidents qui lui sont attribués
DROP POLICY IF EXISTS "incident_reports_installer_select" ON public.incident_reports;
CREATE POLICY "incident_reports_installer_select"
  ON public.incident_reports
  FOR SELECT
  TO authenticated
  USING (
    installer_id = auth.uid()
  );

-- Mise à jour : poseur ne peut modifier que ses propres incidents en attente
DROP POLICY IF EXISTS "incident_reports_installer_update" ON public.incident_reports;
CREATE POLICY "incident_reports_installer_update"
  ON public.incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    installer_id = auth.uid()
    AND status = 'reported_by_owner'
  )
  WITH CHECK (
    installer_id = auth.uid()
  );

-- Admin : lecture et mise à jour totales (service_role contourne RLS de toute façon)
DROP POLICY IF EXISTS "incident_reports_admin_all" ON public.incident_reports;
CREATE POLICY "incident_reports_admin_all"
  ON public.incident_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- ── 4. Index pour les lookups fréquents ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_incident_reports_installer_id
  ON public.incident_reports (installer_id)
  WHERE installer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incident_reports_status
  ON public.incident_reports (status);

-- ── 5. Commentaires ──────────────────────────────────────────────────────────

COMMENT ON COLUMN public.incident_reports.owner_report_photos
  IS 'Photos déposées par le propriétaire lors du signalement vinyle (min 2 requises).';

COMMENT ON COLUMN public.incident_reports.installer_id
  IS 'UUID auth.users du poseur certifié assigné à ce constat contradictoire.';

COMMENT ON COLUMN public.incident_reports.installer_confirmation_photos
  IS 'Photos déposées par le poseur pour confirmer/infirmer le signalement (min 2 requises).';

COMMENT ON COLUMN public.incident_reports.installer_diagnosis
  IS 'Diagnostic du poseur : cause du décollement / dégradation.';

COMMENT ON COLUMN public.incident_reports.installer_confirmed_at
  IS 'Horodatage de la confirmation par le poseur.';
