-- From supabase/migrations/20261110000000_support_rooms_last_read.sql + 20261110040000_support_attachments.sql (ALTER part)
ALTER TABLE public.support_rooms
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS attachment_url   TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type  TEXT;