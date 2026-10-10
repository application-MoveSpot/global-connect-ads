-- Attribue le rôle admin à l'email propriétaire de l'application.
-- S'exécute à chaque déploiement (idempotent grâce à ON CONFLICT DO NOTHING).

-- 0. Fonction RPC check_is_admin() appelée par admin.tsx pour vérifier le rôle
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 1. Grant rétroactif : si l'utilisateur existe déjà dans auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'rakounklub@gmail.com'
ON CONFLICT DO NOTHING;

-- 2. Trigger : grants admin automatiquement lors d'une future inscription
--    avec cet email (Google OAuth ou email/password)
CREATE OR REPLACE FUNCTION public.auto_grant_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'rakounklub@gmail.com'
     OR NEW.raw_user_meta_data->>'email' = 'rakounklub@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_admin_on_signup();
