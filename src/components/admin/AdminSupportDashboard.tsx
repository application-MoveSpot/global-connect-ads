import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, CheckCircle, Loader2, Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Room = {
  id: string;
  status: "open" | "resolved";
  created_at: string;
  advertiser_id: string;
  advertiser?: { full_name: string | null; company: string | null };
  last_message?: string;
};

type Message = {
  id: string;
  content: string;
  sender_type: "advertiser" | "admin";
  created_at: string;
};

export function AdminSupportDashboard() {
  const { t, i18n } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    const { data } = await sb
      .from("support_rooms")
      .select(`id, status, created_at, advertiser_id, advertiser:advertiser_profiles!support_rooms_advertiser_id_fkey(full_name, company)`)
      .order("created_at", { ascending: false });
    setRooms((data as Room[] | null) ?? []);
    setLoadingRooms(false);
  };

  useEffect(() => { void fetchRooms(); }, []);

  const openRoom = async (room: Room) => {
    setSelectedRoom(room);
    setLoadingMsgs(true);
    setMessages([]);
    const { data } = await sb
      .from("support_messages")
      .select("id, content, sender_type, created_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[] | null) ?? []);
    setLoadingMsgs(false);
  };

  // Realtime on selected room
  useEffect(() => {
    if (!selectedRoom) return;
    const channel = sb
      .channel(`admin_support_chat_${selectedRoom.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `room_id=eq.${selectedRoom.id}` },
        (payload: { new: Message }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedRoom?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || !selectedRoom || sending) return;
    setSending(true);
    setReplyText("");
    const session = await getOrRefreshSession();
    if (!session) { setSending(false); return; }
    const { error } = await sb.from("support_messages").insert({
      room_id: selectedRoom.id,
      sender_id: session.user.id,
      sender_type: "admin",
      content: text,
    });
    if (error) toast.error(t("common.error"));
    setSending(false);
  };

  const handleResolve = async () => {
    if (!selectedRoom) return;
    setResolving(true);
    const { error } = await sb
      .from("support_rooms")
      .update({ status: "resolved" })
      .eq("id", selectedRoom.id);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("admin.support.resolved_toast"));
      setSelectedRoom(null);
      await fetchRooms();
    }
    setResolving(false);
  };

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
      </div>
    );
  }

  if (selectedRoom) {
    const advertiser = selectedRoom.advertiser;
    const displayName = advertiser?.company ?? advertiser?.full_name ?? selectedRoom.advertiser_id;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedRoom(null)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary transition flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("admin.support.back_btn")}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedRoom.created_at).toLocaleString(i18n.language)}
            </p>
          </div>
          {selectedRoom.status === "open" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleResolve()}
              disabled={resolving}
              className="text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 shrink-0"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              {t("admin.support.resolve_btn")}
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-y-auto p-4 space-y-3 max-h-96">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("admin.support.empty_conversation")}
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender_type === "admin"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    <p>{m.content}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 text-right">
                      {new Date(m.created_at).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {selectedRoom.status === "open" && (
            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder={t("admin.support.reply_placeholder")}
                className="flex-1 min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!replyText.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const openRooms = rooms.filter((r) => r.status === "open");
  const resolvedRooms = rooms.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{t("admin.support.title")}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {openRooms.length} {t("admin.support.open_count")}
        </span>
      </div>

      {openRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <MessageCircle className="mx-auto h-8 w-8 mb-3 opacity-30" />
          {t("admin.support.no_open_rooms")}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul>
            {openRooms.map((room) => {
              const advertiser = room.advertiser;
              const displayName = advertiser?.company ?? advertiser?.full_name ?? room.advertiser_id;
              return (
                <li key={room.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => void openRoom(room)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(displayName)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(room.created_at).toLocaleString(i18n.language)}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {t("admin.support.status_open")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {resolvedRooms.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground font-medium">
            {t("admin.support.resolved_history", { count: resolvedRooms.length })}
          </summary>
          <div className="mt-2 rounded-2xl border border-border bg-card overflow-hidden">
            <ul>
              {resolvedRooms.map((room) => {
                const advertiser = room.advertiser;
                const displayName = advertiser?.company ?? advertiser?.full_name ?? room.advertiser_id;
                return (
                  <li key={room.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => void openRoom(room)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {(displayName)[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-muted-foreground">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(room.created_at).toLocaleString(i18n.language)}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {t("admin.support.status_resolved")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
