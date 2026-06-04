ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS daily_start_time TIME,
  ADD COLUMN IF NOT EXISTS daily_end_time TIME;