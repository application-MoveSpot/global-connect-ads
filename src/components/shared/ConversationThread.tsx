import { useRef, useState, useEffect, useCallback } from "react";
import { Send, Sparkles, Languages, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  sender_id: string;
  sender_role: "advertiser" | "owner";
  body: string;
  created_at: string;
  read_at: string | null;
};

interface ConversationThreadProps {
  briefId: string;
  proposalId: string | null;
  briefTitle: string;
  messages: ChatMessage[];
  userId: string;
  myRole: "advertiser" | "owner";
  draft: string;
  sending: boolean;
  onDraftChange: (v: string) => void;
  onSend: () => void;
}

// ─── Summary panel ────────────────────────────────────────────────────────────

type SummaryStatus = "negotiating" | "agreed" | "stalled" | "closed";

interface SummaryData {
  summary: string;
  status: SummaryStatus;
  action_required: boolean;
  cached: boolean;
}

function SummaryPanel({ briefId, proposalId }: { briefId: string; proposalId: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke(
        "ai-conversation-summary",
        { body: { brief_id: briefId, proposal_id: proposalId } },
      );
      if (fnErr) throw fnErr;
      setData(res as SummaryData);
    } catch (e) {
      setError(t("ai_chat.error_generic"));
    } finally {
      setLoading(false);
    }
  }, [briefId, proposalId, t]);

  const toggle = () => {
    if (!open && !data) void fetch();
    setOpen((v) => !v);
  };

  const statusColors: Record<SummaryStatus, string> = {
    negotiating: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    agreed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    stalled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  };

  const statusLabels: Record<SummaryStatus, string> = {
    negotiating: t("ai_chat.status.negotiating"),
    agreed: t("ai_chat.status.agreed"),
    stalled: t("ai_chat.status.stalled"),
    closed: t("ai_chat.status.closed"),
  };

  return (
    <div className="border-b border-border">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-secondary/30 transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {t("ai_chat.summary_btn")}
          {data?.action_required && (
            <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 rounded-full">
              {t("ai_chat.action_required")}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="px-4 pb-3">
          {loading && (
            <p className="text-xs text-muted-foreground animate-pulse">{t("ai_chat.summary_loading")}</p>
          )}
          {error && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-destructive">{error}</p>
              <button
                onClick={() => void fetch()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {t("ai_chat.retry")}
              </button>
            </div>
          )}
          {data && !loading && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    statusColors[data.status],
                  )}
                >
                  {statusLabels[data.status]}
                </span>
                {data.cached && (
                  <span className="text-[10px] text-muted-foreground">{t("ai_chat.cached")}</span>
                )}
                <button
                  onClick={() => void fetch()}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  title={t("ai_chat.retry")}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs leading-relaxed">{data.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Message bubble with translation ─────────────────────────────────────────

type TargetLang = "fr" | "en" | "ar";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  dateLocale: string;
}

function MessageBubble({ message, isMe, dateLocale }: MessageBubbleProps) {
  const { t, i18n } = useTranslation();
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState<TargetLang>(
    (i18n.language as TargetLang) ?? "fr",
  );
  const cacheRef = useRef<Record<string, string>>({});

  const translate = useCallback(
    async (lang: TargetLang) => {
      const cacheKey = `${message.id}:${lang}`;
      if (cacheRef.current[cacheKey]) {
        setTranslation(cacheRef.current[cacheKey]);
        setShowTranslation(true);
        return;
      }
      setTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-translate-message", {
          body: { message_id: message.id, message_text: message.body, target_lang: lang },
        });
        if (error) throw error;
        const result = data as { translation: string };
        cacheRef.current[cacheKey] = result.translation;
        setTranslation(result.translation);
        setShowTranslation(true);
      } catch {
        // Silent fail — don't break UX for a translation failure
      } finally {
        setTranslating(false);
      }
    },
    [message.id, message.body],
  );

  const handleTranslateClick = () => {
    if (showTranslation) {
      setShowTranslation(false);
    } else {
      void translate(targetLang);
    }
  };

  const LANGS: TargetLang[] = ["fr", "en", "ar"];

  return (
    <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary rounded-bl-sm",
        )}
      >
        <p className="leading-relaxed break-words">{message.body}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isMe ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {new Date(message.created_at).toLocaleTimeString(dateLocale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Translation block */}
      {showTranslation && translation && (
        <div
          className={cn(
            "max-w-[70%] rounded-xl px-3 py-2 text-xs border border-border bg-card text-muted-foreground relative",
            isMe ? "mr-0" : "ml-0",
          )}
          dir={targetLang === "ar" ? "rtl" : "ltr"}
        >
          <button
            onClick={() => setShowTranslation(false)}
            className="absolute top-1 right-1 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="pr-4 leading-relaxed">{translation}</p>
          <span className="text-[9px] uppercase tracking-wide opacity-50 mt-0.5 block">
            → {targetLang.toUpperCase()}
          </span>
        </div>
      )}

      {/* Translate button — only for messages from the other party */}
      {!isMe && (
        <div className="flex items-center gap-1 mt-0.5">
          {translating ? (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              {t("ai_chat.translating")}
            </span>
          ) : (
            <>
              <button
                onClick={handleTranslateClick}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition"
              >
                <Languages className="w-3 h-3" />
                {showTranslation ? t("ai_chat.hide_translation") : t("ai_chat.translate")}
              </button>
              {!showTranslation && (
                <div className="flex gap-0.5">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setTargetLang(l);
                        void translate(l);
                      }}
                      className={cn(
                        "text-[9px] uppercase px-1 rounded transition",
                        targetLang === l
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Smart replies chips ──────────────────────────────────────────────────────

interface SmartRepliesProps {
  briefId: string;
  proposalId: string | null;
  myRole: "advertiser" | "owner";
  messages: ChatMessage[];
  onSelect: (text: string) => void;
}

function SmartReplies({ briefId, proposalId, myRole, messages, onSelect }: SmartRepliesProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const lastFetchedMsgId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_role === myRole) return; // my own message — skip
    if (lastMsg.id === lastFetchedMsgId.current) return; // already fetched for this msg

    lastFetchedMsgId.current = lastMsg.id;

    supabase.functions
      .invoke("ai-smart-replies", {
        body: {
          brief_id: briefId,
          proposal_id: proposalId,
          my_role: myRole,
          last_message_id: lastMsg.id,
        },
      })
      .then(({ data }) => {
        const result = data as { suggestions: string[] } | null;
        setSuggestions(result?.suggestions ?? []);
      })
      .catch(() => setSuggestions([]));
  }, [messages, briefId, proposalId, myRole]);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-border bg-secondary/20 flex flex-col gap-1.5">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {t("ai_chat.smart_replies_label")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              onSelect(s);
              setSuggestions([]);
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition"
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setSuggestions([])}
          className="text-[10px] text-muted-foreground hover:text-foreground ml-auto"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ConversationThread component ───────────────────────────────────────

export function ConversationThread({
  briefId,
  proposalId,
  briefTitle,
  messages,
  userId,
  myRole,
  draft,
  sending,
  onDraftChange,
  onSend,
}: ConversationThreadProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="font-semibold text-sm">{briefTitle}</p>
      </div>

      {/* AI Summary panel */}
      {messages.length >= 3 && (
        <div className="shrink-0">
          <SummaryPanel briefId={briefId} proposalId={proposalId} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((m) => {
          const isMe = m.sender_role === myRole;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              isMe={isMe}
              dateLocale={dateLocale}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Smart Replies */}
      <SmartReplies
        briefId={briefId}
        proposalId={proposalId}
        myRole={myRole}
        messages={messages}
        onSelect={onDraftChange}
      />

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex gap-2 shrink-0">
        <input
          data-testid="chat-message-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={t("ai_chat.placeholder")}
          maxLength={2000}
          className="flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={onSend}
          disabled={!draft.trim() || sending}
          className="rounded-lg bg-primary text-primary-foreground p-2.5 hover:bg-primary/90 disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
