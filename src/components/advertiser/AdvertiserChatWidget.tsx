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

export function AdvertiserChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const session = await getOrRefreshSession();
      if (!session) return;
      const uid = session.user.id;

      // Get or create room for this advertiser
      const { data: existing } = await sb
        .from("support_rooms")
        .select("id")
        .eq("advertiser_id", uid)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let rid: string;
      if (existing) {
        rid = (existing as { id: string }).id;
      } else {
        const { data: created } = await sb
          .from("support_rooms")
          .insert({ advertiser_id: uid })
          .select("id")
          .single();
        rid = (created as { id: string }).id;
      }
      setRoomId(rid);

      const { data: msgs } = await sb
        .from("support_messages")
        .select("id, content, sender_type, created_at")
        .eq("room_id", rid)
        .order("created_at", { ascending: true });
      setMessages((msgs as Message[] | null) ?? []);
      setLoading(false);
    })();
  }, [open]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = sb
      .channel(`support_chat_${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `room_id=eq.${roomId}` },
        (payload: { new: Message }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [roomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !roomId || sending) return;
    setSending(true);
    setInput("");
    const session = await getOrRefreshSession();
    if (!session) { setSending(false); return; }
    await sb.from("support_messages").insert({
      room_id: roomId,
      sender_id: session.user.id,
      sender_type: "advertiser",
      content: text,
    });
    setSending(false);
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("advertiser.support.open_chat")}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
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
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20 transition">
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
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
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
