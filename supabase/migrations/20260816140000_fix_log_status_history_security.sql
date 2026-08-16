-- =========================================================
-- Correction avertissement Supabase :
-- "Le public peut exécuter la fonction SECURITY DEFINER"
--
-- log_status_history() est une fonction TRIGGER — elle ne peut
-- pas être appelée directement via RPC (type de retour : trigger).
-- La migration 20260812093000 avait révoqué anon et authenticated
-- mais avait oublié de révoquer PUBLIC (le rôle pseudo par défaut
-- dont tous les rôles héritent), ce qui laissait le grant initial
-- de PostgreSQL visible au linter Supabase.
-- =========================================================

REVOKE ALL ON FUNCTION public.log_status_history() FROM PUBLIC, anon, authenticated;
