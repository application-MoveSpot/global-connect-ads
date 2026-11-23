-- Suppression des rôles admin orphelins (comptes de test jamais connectés).
-- Conserve uniquement rakounklub@gmail.com comme administrateur actif.
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE email IN (
      'rakounklub+old@gmail.com',
      'proprietaire-test+old@movespot.fr'
    )
  );
