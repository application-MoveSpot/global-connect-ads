-- Track when the advertiser last read the conversation
ALTER TABLE public.support_rooms
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;
