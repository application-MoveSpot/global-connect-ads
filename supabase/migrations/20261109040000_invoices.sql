-- ─────────────────────────────────────────────────────────────────────────────
-- PR #367 — Facturation : table invoices + RLS + bucket Storage
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Séquence pour numéros de facture ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.invoices_seq START 1;

-- ── Table invoices ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT        NOT NULL UNIQUE,
  campaign_id     UUID        NOT NULL REFERENCES public.campaign_requests(id) ON DELETE RESTRICT,
  advertiser_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_ht       NUMERIC(10,2) NOT NULL,
  amount_ttc      NUMERIC(10,2) NOT NULL,
  vat_amount      NUMERIC(10,2) NOT NULL,
  pdf_url         TEXT,
  status          TEXT        NOT NULL DEFAULT 'paid'
                              CHECK (status IN ('paid', 'pending', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_advertiser_id_idx
  ON public.invoices (advertiser_id);

CREATE INDEX IF NOT EXISTS invoices_campaign_id_idx
  ON public.invoices (campaign_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- L'annonceur lit uniquement ses factures
CREATE POLICY "Advertisers can view own invoices"
  ON public.invoices FOR SELECT
  USING (advertiser_id = auth.uid());

-- Les admins ont accès total
CREATE POLICY "Admins have full access to invoices"
  ON public.invoices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Le service_role (Edge Functions) peut tout faire
CREATE POLICY "Service role bypass"
  ON public.invoices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL    ON public.invoices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoices_seq TO service_role;

-- ── Bucket Storage privé pour les PDF ─────────────────────────────────────────
-- Bucket privé : accessible uniquement via URL signées
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices-archive',
  'invoices-archive',
  false,
  10485760,   -- 10 Mo max par fichier
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage : l'annonceur peut lire les fichiers de son dossier
CREATE POLICY "Advertisers can read own invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices-archive'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy Storage : le service_role peut tout faire dans ce bucket
CREATE POLICY "Service role can manage invoice PDFs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'invoices-archive')
  WITH CHECK (bucket_id = 'invoices-archive');
