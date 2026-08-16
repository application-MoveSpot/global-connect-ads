-- =========================================================
-- Correction avertissement Supabase :
-- "Les utilisateurs connectés peuvent exécuter la fonction
-- SECURITY DEFINER public.has_role via /rest/v1/rpc/has_role"
--
-- has_role est une fonction SECURITY DEFINER utilisée
-- exclusivement dans les politiques RLS (ex. admins see all
-- wallets, Admins can view all advertiser profiles, etc.).
--
-- En PostgreSQL, les politiques RLS appellent les fonctions
-- via le moteur de base de données — l'utilisateur connecté
-- n'a pas besoin du droit EXECUTE pour que les politiques
-- fonctionnent. Révoquer authenticated ne casse donc pas
-- le filtrage RLS.
--
-- L'accès direct via /rest/v1/rpc/has_role est supprimé :
-- aucune route frontend n'en a besoin (les vérifications de
-- rôle se font via les politiques RLS, pas en RPC direct).
-- =========================================================

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
