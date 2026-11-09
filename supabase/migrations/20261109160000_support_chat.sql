-- Support chat: support_rooms + support_messages tables

CREATE TABLE IF NOT EXISTS public.support_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertiser_profiles(user_id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.support_rooms(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('advertiser', 'admin')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS support_rooms_advertiser_idx ON public.support_rooms(advertiser_id);
CREATE INDEX IF NOT EXISTS support_messages_room_idx ON public.support_messages(room_id);

-- RLS
ALTER TABLE public.support_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- support_rooms policies
CREATE POLICY "advertiser_own_rooms" ON public.support_rooms
  FOR ALL USING (advertiser_id = auth.uid());

CREATE POLICY "admin_all_rooms" ON public.support_rooms
  FOR ALL USING (public.is_admin());

-- support_messages policies
CREATE POLICY "advertiser_own_messages" ON public.support_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.support_rooms sr WHERE sr.id = room_id AND sr.advertiser_id = auth.uid())
  );

CREATE POLICY "admin_all_messages" ON public.support_messages
  FOR ALL USING (public.is_admin());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
