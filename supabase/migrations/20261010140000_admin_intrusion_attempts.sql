-- Table de journalisation des tentatives d'accès non autorisé à /admin
CREATE TABLE IF NOT EXISTS public.admin_intrusion_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text,
  user_agent  text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Seul le service_role peut lire (pour la sécurité)
ALTER TABLE public.admin_intrusion_attempts ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent insérer leur propre tentative
CREATE POLICY "authenticated_can_insert_own_intrusion"
  ON public.admin_intrusion_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Seul admin peut lire
CREATE POLICY "admin_can_read_intrusions"
  ON public.admin_intrusion_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
