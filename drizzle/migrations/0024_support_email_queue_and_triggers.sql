-- From supabase/migrations/20261110010000_support_email_queue.sql
CREATE TABLE IF NOT EXISTS public.support_email_queue (
  room_id      UUID PRIMARY KEY REFERENCES public.support_rooms(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only: the queue is read/written by privileged processing, never by the app.
GRANT ALL ON public.support_email_queue TO service_role;
ALTER TABLE public.support_email_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_admin_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    INSERT INTO public.support_email_queue (room_id, scheduled_at, status, updated_at)
    VALUES (NEW.room_id, now() + INTERVAL '10 minutes', 'pending', now())
    ON CONFLICT (room_id)
    DO UPDATE SET
      scheduled_at = now() + INTERVAL '10 minutes',
      status       = 'pending',
      updated_at   = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_admin_message_notification
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_message_notification();

CREATE OR REPLACE FUNCTION public.handle_advertiser_read_cancel_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_read_at IS DISTINCT FROM OLD.last_read_at AND NEW.last_read_at IS NOT NULL THEN
    UPDATE public.support_email_queue
    SET status     = 'cancelled',
        updated_at = now()
    WHERE room_id = NEW.id
      AND status  = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_advertiser_read_cancel_email
  AFTER UPDATE OF last_read_at ON public.support_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_advertiser_read_cancel_email();