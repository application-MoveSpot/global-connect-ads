-- Historique des changements de statut (motif de refus compris) : jusqu'ici chaque
-- statut (campagne, pose, certification poseur, prestataire) était un simple champ
-- écrasé à chaque transition — aucune trace des refus précédents n'était conservée.
-- Cette table capture automatiquement chaque transition via triggers, avec le motif
-- associé (colonne "notes" correspondante) et, quand disponible, l'auteur du changement.
CREATE TABLE public.status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_history_entity_type_check CHECK (
    entity_type IN ('campaign_status', 'campaign_installation', 'payee_certification', 'provider_status')
  )
);

CREATE INDEX idx_status_history_entity ON public.status_history(entity_type, entity_id, created_at DESC);

GRANT SELECT ON public.status_history TO authenticated;
GRANT ALL ON public.status_history TO service_role;

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all status history"
  ON public.status_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advertisers view their campaign status history"
  ON public.status_history FOR SELECT TO authenticated
  USING (
    entity_type IN ('campaign_status', 'campaign_installation')
    AND EXISTS (
      SELECT 1 FROM public.campaign_requests cr
      WHERE cr.id = status_history.entity_id AND cr.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners view installation history on their vehicles"
  ON public.status_history FOR SELECT TO authenticated
  USING (
    entity_type = 'campaign_installation'
    AND EXISTS (
      SELECT 1 FROM public.campaign_requests cr
      JOIN public.vehicles v ON v.id = cr.vehicle_id
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE cr.id = status_history.entity_id AND op.user_id = auth.uid()
    )
  );

CREATE POLICY "Installers view installation history for open jobs"
  ON public.status_history FOR SELECT TO authenticated
  USING (
    entity_type = 'campaign_installation'
    AND EXISTS (
      SELECT 1 FROM public.campaign_requests cr
      JOIN public.payee_profiles pp ON pp.user_id = auth.uid()
      WHERE cr.id = status_history.entity_id
        AND cr.status = 'approved'
        AND pp.kind IN ('installer', 'both')
        AND pp.certification_status = 'certified'
    )
  );

CREATE POLICY "Payees view their own certification history"
  ON public.status_history FOR SELECT TO authenticated
  USING (
    entity_type = 'payee_certification'
    AND EXISTS (
      SELECT 1 FROM public.payee_profiles pp
      WHERE pp.id = status_history.entity_id AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers view their own status history"
  ON public.status_history FOR SELECT TO authenticated
  USING (
    entity_type = 'provider_status'
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pr
      WHERE pr.user_id = status_history.entity_id AND pr.user_id = auth.uid()
    )
  );

-- Fonction de trigger générique : TG_ARGV[0] = colonne de statut, TG_ARGV[1] = colonne
-- de motif associée, TG_ARGV[2] = entity_type à journaliser, TG_ARGV[3] = colonne
-- servant de clé primaire de la ligne (les tables du domaine n'ont pas toutes une
-- colonne "id" — provider_profiles est indexée par user_id). N'insère que si le
-- statut a réellement changé. actor_id = auth.uid() (NULL pour les actions effectuées
-- avec la clé service_role, ex. les fonctions serveur admin actuelles).
CREATE OR REPLACE FUNCTION public.log_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_entity_id uuid;
BEGIN
  v_old_status := to_jsonb(OLD) ->> TG_ARGV[0];
  v_new_status := to_jsonb(NEW) ->> TG_ARGV[0];

  IF v_old_status IS DISTINCT FROM v_new_status THEN
    v_entity_id := (to_jsonb(NEW) ->> TG_ARGV[3])::uuid;
    INSERT INTO public.status_history (entity_type, entity_id, previous_status, new_status, reason, actor_id)
    VALUES (TG_ARGV[2], v_entity_id, v_old_status, v_new_status, to_jsonb(NEW) ->> TG_ARGV[1], auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_status_history() FROM anon, authenticated;

CREATE TRIGGER campaign_requests_status_history
  AFTER UPDATE ON public.campaign_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_status_history('status', 'admin_notes', 'campaign_status', 'id');

CREATE TRIGGER campaign_requests_installation_status_history
  AFTER UPDATE ON public.campaign_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_status_history('installation_status', 'installation_notes', 'campaign_installation', 'id');

CREATE TRIGGER payee_profiles_certification_status_history
  AFTER UPDATE ON public.payee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_status_history('certification_status', 'certification_notes', 'payee_certification', 'id');

CREATE TRIGGER provider_profiles_status_history
  AFTER UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_status_history('status', 'admin_notes', 'provider_status', 'user_id');
