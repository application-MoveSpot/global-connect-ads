import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { ArrowLeft, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/advertiser/messages")({
  head: () => ({
    meta: [{ title: "Messagerie — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdvertiserMessagesPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Thread = {
  brief_id: string;
  brief_title: string;
  proposal_id: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

type Message = {
  id: string;
  sender_id: string;
  sender_role: "advertiser" | "owner";
  body: string;
  created_at: string;
  read_at: string | null;
};

function AdvertiserMessagesPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      const uid = session.user.id;
      setUserId(uid);
      await loadThreads(uid);
      setLoading(false);
    })();
  }, [navigate]);

  const loadThreads = async (uid: string) => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, brief_id, proposal_id, body, created_at, read_at, sender_role")
      .order("created_at", { ascending: false });

    if (!msgs) return;

    const { data: briefs } = await supabase
      .from("advertiser_briefs")
      .select("id, title")
      .eq("advertiser_id", uid);

    const briefMap: Record<string, string> = {};
    for (const b of briefs ?? []) briefMap[b.id] = b.title;

    // Group by brief_id+proposal_id
    const map = new Map<string, Thread>();
    for (const m of msgs) {
      if (!briefMap[m.brief_id]) continue;
      const key = `${m.brief_id}::${m.proposal_id ?? "null"}`;
      if (!map.has(key)) {
        map.set(key, {
          brief_id: m.brief_id,
          brief_title: briefMap[m.brief_id] ?? "Brief",
          proposal_id: m.proposal_id,
          last_message: m.body.slice(0, 80),
          last_at: m.created_at,
          unread: 0,
        });
      }
      const t = map.get(key)!;
      if (!m.read_at && m.sender_role === "owner") t.unread++;
    }

    setThreads(Array.from(map.values()).sort((a, b) => b.last_at.localeCompare(a.last_at)));
  };

  const openThread = async (thread: Thread) => {
    setActiveThread(thread);
    await loadMessages(thread);
  };

  const loadMessages = async (thread: Thread) => {
    let q = supabase
      .from("messages")
      .select("id, sender_id, sender_role, body, created_at, read_at")
      .eq("brief_id", thread.brief_id)
      .order("created_at", { ascending: true });

    if (thread.proposal_id) q = q.eq("proposal_id", thread.proposal_id);

    const { data } = await q;
    setMessages((data as Message[]) ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeThread || !userId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      brief_id: activeThread.brief_id,
      proposal_id: activeThread.proposal_id,
      sender_id: userId,
      sender_role: "advertiser",
      body: draft.trim(),
    });
    if (!error) {
      setDraft("");
      await loadMessages(activeThread);
      await loadThreads(userId);
    }
    setSending(false);
  };

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`advertiser-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async () => {
          await loadThreads(userId);
          if (activeThread) await loadMessages(activeThread);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeThread]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("advertiser.messages.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">
              {t("advertiser.messages.title")}
            </h1>
          </div>
          <Link
            to="/advertiser"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("advertiser.messages.back")}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
          {/* Thread list */}
          <div className="rounded-2xl border border-border bg-card overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <div className="text-3xl mb-2">💬</div>
                {t("advertiser.messages.empty")}
                <p className="text-xs mt-1">{t("advertiser.messages.empty_hint")}</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={`${t.brief_id}::${t.proposal_id}`}
                  onClick={() => openThread(t)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/40 transition",
                    activeThread?.brief_id === t.brief_id &&
                      activeThread.proposal_id === t.proposal_id &&
                      "bg-secondary/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{t.brief_title}</span>
                    {t.unread > 0 && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(t.last_at).toLocaleDateString(dateLocale)}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Message thread */}
          {activeThread ? (
            <div className="rounded-2xl border border-border bg-card flex flex-col">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-semibold text-sm">{activeThread.brief_title}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const isMe = m.sender_role === "advertiser";
                  return (
                    <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary rounded-bl-sm",
                        )}
                      >
                        <p className="leading-relaxed">{m.body}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isMe ? "text-primary-foreground/60" : "text-muted-foreground",
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString(dateLocale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={t("advertiser.messages.placeholder")}
                  maxLength={2000}
                  className="flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending}
                  className="rounded-lg bg-primary text-primary-foreground p-2.5 hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card flex items-center justify-center text-muted-foreground text-sm">
              {t("advertiser.messages.select_thread")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
