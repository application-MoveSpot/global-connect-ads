import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";

type Message = {
  id: string;
  content: string;
  sender_type: "advertiser" | "admin";
  created_at: string;
};

type Room = {
  id: string;
  last_read_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/** Fetch or create the advertiser's open support room. */
async function getOrCreateRoom(uid: string): Promise<Room> {
  const { data: existing } = await sb
    .from("support_rooms")
    .select("id, last_read_at")
    .eq("advertiser_id", uid)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Room;

  const { data: created } = await sb
    .from("support_rooms")
    .insert({ advertiser_id: uid })
    .select("id, last_read_at")
    .single();

  return created as Room;
}

/**
 * Count unread admin messages: messages from "admin" that arrived
 * after the advertiser's last_read_at (or all if never read).
 */
async function fetchUnreadCount(roomId: string, lastReadAt: string | null): Promise<number> {
  let query = sb
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("sender_type", "admin");

  if (lastReadAt) {
    query = query.gt("created_at", lastReadAt);
  }

  const { count } = await query;
  return (count as number | null) ?? 0;
}

/**
 * Stamp last_read_at = now() on the room so the next unread count
 * starts from this moment.
 */
async function markRoomAsRead(roomId: string): Promise<void> {
  await sb
    .from("support_rooms")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", roomId);
}

export function AdvertiserChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep a ref so the Realtime callback always sees the current `open` value
  // without needing to re-subscribe on every toggle.
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // ── 1. Mount: resolve room + initial unread count ──────────────────────────
  useEffect(() => {
    void (async () => {
      const session = await getOrRefreshSession();
      if (!session) return;

      const r = await getOrCreateRoom(session.user.id);
      setRoom(r);

      const count = await fetchUnreadCount(r.id, r.last_read_at);
      setUnreadCount(count);
    })();
  }, []);

  // ── 2. Realtime: subscribe once room is known, stays active while mounted ──
  useEffect(() => {
    if (!room) return;

    const channel = sb
      .channel(`support_chat_${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload: { new: Message }) => {
          const msg = payload.new;

          // Append to history if the window is open (dedup by id)
          if (openRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
          }

          // Increment badge only for admin messages when window is closed
          if (msg.sender_type === "admin" && !openRef.current) {
            setUnreadCount((n) => n + 1);
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [room?.id]);

  // ── 3. Open: load full history + stamp last_read_at ────────────────────────
  useEffect(() => {
    if (!open || !room) return;

    setLoading(true);
    void (async () => {
      const { data: msgs } = await sb
        .from("support_messages")
        .select("id, content, sender_type, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true });
      setMessages((msgs as Message[] | null) ?? []);
      setLoading(false);

      // Mark as read and clear the badge
      await markRoomAsRead(room.id);
      setUnreadCount(0);
      // Keep room.last_read_at in sync locally so a re-mount calculates correctly
      setRoom((r) => r ? { ...r, last_read_at: new Date().toISOString() } : r);
    })();
  }, [open]);

  // ── 4. Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !room || sending) return;
    setSending(true);
    setInput("");
    const session = await getOrRefreshSession();
    if (!session) { setSending(false); return; }
    await sb.from("support_messages").insert({
      room_id: room.id,
      sender_id: session.user.id,
      sender_type: "advertiser",
      content: text,
    });
    setSending(false);
  };

  const handleOpen = () => setOpen((v) => !v);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("advertiser.support.open_chat")}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{t("advertiser.support.title")}</p>
              <p className="text-xs opacity-75">{t("advertiser.support.online_status")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {t("advertiser.support.empty_chat")}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_type === "advertiser" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender_type === "advertiser"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={t("advertiser.support.input_placeholder")}
              className="flex-1 min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              disabled={sending || loading}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
