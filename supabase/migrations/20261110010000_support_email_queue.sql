-- File d'attente des notifications email pour le chat support
-- Pattern debounce : un seul email par room, repoussé à chaque nouveau message admin

CREATE TABLE IF NOT EXISTS public.support_email_queue (
  -- Une seule entrée par room (PRIMARY KEY = debounce naturel)
  room_id     UUID PRIMARY KEY REFERENCES public.support_rooms(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seul le service_role (Edge Functions) peut lire/écrire cette table.
-- Les politiques RLS côté user sont volontairement absentes : service_role
-- bypass RLS par défaut dans Supabase, aucune policy n'est nécessaire.
ALTER TABLE public.support_email_queue ENABLE ROW LEVEL SECURITY;

-- Fonction déclenchée après chaque INSERT sur support_messages
CREATE OR REPLACE FUNCTION public.handle_admin_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql           -- ← corrigé : plpgsql (PostgreSQL), pas plsql (Oracle)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On ne planifie un mail QUE si le message vient d'un admin
  IF NEW.sender_type = 'admin' THEN
    INSERT INTO public.support_email_queue (room_id, scheduled_at, status, updated_at)
    VALUES (NEW.room_id, now() + INTERVAL '10 minutes', 'pending', now())
    ON CONFLICT (room_id)
    DO UPDATE SET
      scheduled_at = now() + INTERVAL '10 minutes', -- Debounce : repousse le délai
      status       = 'pending',
      updated_at   = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger sur support_messages
CREATE OR REPLACE TRIGGER trigger_admin_message_notification
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_message_notification();

-- Annuler l'email si l'annonceur lit le message avant l'expiration du délai.
-- Déclenché quand advertiser.index ouvre le widget et appelle markRoomAsRead
-- (UPDATE support_rooms SET last_read_at = now()).
CREATE OR REPLACE FUNCTION public.handle_advertiser_read_cancel_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- last_read_at vient d'être mis à jour → l'annonceur a lu → annuler l'email pending
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
