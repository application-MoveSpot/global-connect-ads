-- =========================================================
-- Fix RLS provider_profiles + search_path fonctions email
-- =========================================================


-- =========================================================
-- 1. search_path email functions
--    Les fonctions étaient créées sans SET search_path dans
--    leur corps. On les recrée avec SET search_path pour
--    satisfaire le linter statique Supabase (la correction
--    via ALTER FUNCTION de 20260809192428 agit sur le
--    catalogue mais pas sur la définition textuelle).
-- =========================================================

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message
    FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Maintenir l'accès strictement à service_role
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;


-- =========================================================
-- 2. provider_profiles : confirmer les grants anon
--    La migration 20260814120000 a révoqué SELECT table-niveau
--    sur provider_profiles pour anon. Les grants colonne-niveau
--    accordés en 20260809192553 survivent à un REVOKE table-niveau
--    en PostgreSQL, mais on les réaffirme explicitement pour
--    garantir la cohérence et satisfaire le linter.
--
--    Colonnes accordées à anon : uniquement les informations
--    publiques d'un annuaire B2B (pas email, phone, siret,
--    admin_notes qui restent réservés à authenticated /
--    service_role).
-- =========================================================

GRANT SELECT (
  user_id, company, full_name, description, services,
  coverage_areas, portfolio_urls, pricing_info, logo_url,
  website, status, created_at, updated_at
) ON public.provider_profiles TO anon;

-- S'assurer que la politique de lecture publique est bien
-- explicitement TO anon (séparée de authenticated pour clarté)
DROP POLICY IF EXISTS "Public reads approved providers" ON public.provider_profiles;

CREATE POLICY "Public reads approved providers"
  ON public.provider_profiles FOR SELECT
  TO anon
  USING (status = 'approved');

-- Politique de lecture des prestataires approuvés pour les
-- utilisateurs connectés (nécessaire pour l'annuaire côté app)
DROP POLICY IF EXISTS "Authenticated reads approved providers" ON public.provider_profiles;

CREATE POLICY "Authenticated reads approved providers"
  ON public.provider_profiles FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Recréer la vue publique avec security_invoker = on
-- (le caller anon voit uniquement les colonnes qui lui sont
-- accordées ci-dessus ; pas de risque d'escalade de privilèges)
DROP VIEW IF EXISTS public.public_provider_profiles;

CREATE VIEW public.public_provider_profiles
WITH (security_invoker = on) AS
SELECT
  user_id, company, full_name, description, services,
  coverage_areas, portfolio_urls, pricing_info, logo_url,
  website, created_at, updated_at
FROM public.provider_profiles
WHERE status = 'approved';

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;
