-- ─────────────────────────────────────────────────────────────────────────────
-- feat(analytics): table campaign_monthly_stats + bucket campaign-reports
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table campaign_monthly_stats ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_monthly_stats (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id             UUID          NOT NULL REFERENCES public.campaign_requests(id) ON DELETE CASCADE,
  advertiser_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_period           TEXT          NOT NULL,         -- "2026-11"
  total_kilometers        NUMERIC(10,2) NOT NULL DEFAULT 0,
  active_vehicles_count   INTEGER       NOT NULL DEFAULT 0,
  estimated_impressions   INTEGER       NOT NULL DEFAULT 0,
  heatmap_summary_url     TEXT,
  pdf_storage_url         TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, report_period)
);

CREATE INDEX IF NOT EXISTS cms_advertiser_period_idx
  ON public.campaign_monthly_stats (advertiser_id, report_period DESC);

CREATE INDEX IF NOT EXISTS cms_campaign_period_idx
  ON public.campaign_monthly_stats (campaign_id, report_period DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.campaign_monthly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own monthly stats"
  ON public.campaign_monthly_stats FOR SELECT
  USING (advertiser_id = auth.uid());

CREATE POLICY "Admins have full access to monthly stats"
  ON public.campaign_monthly_stats FOR ALL
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role bypass monthly stats"
  ON public.campaign_monthly_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.campaign_monthly_stats TO authenticated;
GRANT ALL    ON public.campaign_monthly_stats TO service_role;

-- ── Bucket Storage privé pour les rapports PDF ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-reports',
  'campaign-reports',
  false,
  10485760,       -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Seul service_role peut écrire/lire dans ce bucket
CREATE POLICY "Service role manages campaign reports"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'campaign-reports')
  WITH CHECK (bucket_id = 'campaign-reports');

-- L'annonceur peut lire uniquement ses propres rapports (chemin : {advertiser_id}/...)
CREATE POLICY "Advertisers read own reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'campaign-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
