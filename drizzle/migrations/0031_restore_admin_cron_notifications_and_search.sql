-- 1. Colonnes Stripe manquantes sur bank_transfer_requests
ALTER TABLE public.bank_transfer_requests
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

-- 2. Table des journaux cron (admin)
CREATE TABLE IF NOT EXISTS public.admin_cron_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  parent_log_id bigint REFERENCES public.admin_cron_logs(id) ON DELETE SET NULL,
  result jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_cron_logs_status ON public.admin_cron_logs (status, executed_at DESC);
GRANT SELECT ON public.admin_cron_logs TO authenticated;
GRANT ALL ON public.admin_cron_logs TO service_role;
ALTER TABLE public.admin_cron_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_cron_logs_admin_read ON public.admin_cron_logs;
CREATE POLICY admin_cron_logs_admin_read ON public.admin_cron_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- 3. Table des notifications utilisateur
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  href text,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notifications_owner_read ON public.user_notifications;
CREATE POLICY user_notifications_owner_read ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_notifications_owner_dismiss ON public.user_notifications;
CREATE POLICY user_notifications_owner_dismiss ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. RPC retry_bank_transfer (remet failed -> pending, réservé admin)
CREATE OR REPLACE FUNCTION public.retry_bank_transfer(request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs';
  END IF;

  UPDATE public.bank_transfer_requests
  SET status = 'pending',
      failure_reason = NULL,
      updated_at = now()
  WHERE id = request_id
    AND status = 'failed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ligne % introuvable ou statut différent de failed', request_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'retried_id', request_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.retry_bank_transfer(uuid) TO authenticated;

-- 5. Recherche sémantique prestataires (pgvector + match_providers)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);

CREATE OR REPLACE FUNCTION public.match_providers(
  query_embedding extensions.vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  company text,
  full_name text,
  description text,
  coverage_areas text[],
  pricing_info text,
  logo_url text,
  website text,
  services text[],
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    pp.user_id,
    pp.company,
    pp.full_name,
    pp.description,
    pp.coverage_areas,
    pp.pricing_info,
    pp.logo_url,
    pp.website,
    pp.services,
    1 - (pp.embedding <=> query_embedding) AS similarity
  FROM provider_profiles pp
  WHERE
    pp.status = 'approved'
    AND pp.embedding IS NOT NULL
    AND (filter_category IS NULL OR pp.services @> array[filter_category])
    AND 1 - (pp.embedding <=> query_embedding) > match_threshold
  ORDER BY pp.embedding <=> query_embedding
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_providers(extensions.vector(384), float, int, text) TO authenticated;