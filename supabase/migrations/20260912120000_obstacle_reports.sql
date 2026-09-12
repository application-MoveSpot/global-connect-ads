-- Signalements d'obstacles avec preuves photographiques
-- Persiste les rapports chauffeur (météo, travaux, manifestations, etc.)
-- Les photos sont stockées dans le bucket obstacle-reports (Supabase Storage).

-- ----------------------------------------------------------------
-- Table obstacle_reports
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obstacle_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  campaign_id   uuid        REFERENCES public.campaign_requests(id) ON DELETE SET NULL,
  obstacle_type text        NOT NULL,
  description   text,
  photo_paths   text[]      NOT NULL DEFAULT '{}',
  reported_at   timestamptz NOT NULL DEFAULT now(),
  metadata      jsonb
);

ALTER TABLE public.obstacle_reports ENABLE ROW LEVEL SECURITY;

-- Seuls les admins lisent et gèrent les signalements
CREATE POLICY "admin_all_obstacle_reports"
  ON public.obstacle_reports
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- Le service (supabaseAdmin) insère via la fonction serveur — pas de politique INSERT
-- publique : toutes les insertions passent par le service role (bypass RLS).

-- ----------------------------------------------------------------
-- Bucket Supabase Storage : obstacle-reports
-- Privé : aucun accès public. Lecture réservée aux admins via signed URLs.
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obstacle-reports',
  'obstacle-reports',
  false,
  3145728,   -- 3 MB par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage : lecture admin uniquement (uploads via service role uniquement)
CREATE POLICY "obstacle_reports_admin_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'obstacle-reports'
    AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );
