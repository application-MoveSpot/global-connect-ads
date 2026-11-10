-- Planification nocturne de la clôture des campagnes expirées via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Table de logs pour l'historique admin
CREATE TABLE IF NOT EXISTS public.admin_cron_logs (
    id          BIGSERIAL    PRIMARY KEY,
    job_name    TEXT         NOT NULL,
    result      JSONB,
    executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_cron_logs ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux admins, écriture uniquement via SECURITY DEFINER
CREATE POLICY "admin_cron_logs_select" ON public.admin_cron_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Index pour accélerer les consultations par date et par job
CREATE INDEX IF NOT EXISTS idx_admin_cron_logs_executed_at
    ON public.admin_cron_logs (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_cron_logs_job_name
    ON public.admin_cron_logs (job_name);

-- Planifier à 2h00 UTC chaque nuit
-- Stocke le résumé JSON dans admin_cron_logs pour traçabilité admin
SELECT cron.schedule(
    'expire-campaigns-nightly',
    '0 2 * * *',
    $$
        INSERT INTO public.admin_cron_logs (job_name, result)
        SELECT 'expire-campaigns-nightly', public.process_expired_campaigns_payouts();
    $$
);
