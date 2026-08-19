ALTER TABLE public.advertiser_briefs
  ADD COLUMN IF NOT EXISTS ad_format text;
