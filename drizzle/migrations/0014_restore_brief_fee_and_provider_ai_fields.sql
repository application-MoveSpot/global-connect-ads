ALTER TABLE public.advertiser_briefs ADD COLUMN IF NOT EXISTS poseur_fee numeric;
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS docs_ai_status text;
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS docs_ai_report jsonb;