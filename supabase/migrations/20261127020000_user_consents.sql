-- Migration : table centralisée des consentements initiaux (inscription)
-- Stocke les timestamps CGU/confidentialité + opt-in marketing pour TOUS les rôles
-- dès la création du compte (email ou OAuth Google), avant sélection du rôle.

CREATE TABLE IF NOT EXISTS public.user_consents (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_accepted_at    TIMESTAMPTZ,
  privacy_accepted_at  TIMESTAMPTZ,
  marketing_consent    BOOLEAN     NOT NULL DEFAULT false,
  marketing_consent_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_consents_user_id_key UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_consents_self_select" ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_consents_self_insert" ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_consents_self_update" ON public.user_consents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_consents_admin_select" ON public.user_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
