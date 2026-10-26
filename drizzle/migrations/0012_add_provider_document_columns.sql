ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS kbis_url text,
  ADD COLUMN IF NOT EXISTS rc_pro_url text,
  ADD COLUMN IF NOT EXISTS rc_pro_expiry text,
  ADD COLUMN IF NOT EXISTS rib_url text,
  ADD COLUMN IF NOT EXISTS id_doc_url text;