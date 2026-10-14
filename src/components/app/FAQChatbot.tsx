import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type ChatAudience = "advertiser" | "owner" | "partner" | "provider";

type Props = {
  audience: ChatAudience;
  suggestions?: string[];
  /** Contexte utilisateur injecté dans le prompt (solde, nb campagnes…) */
  userContext?: string;
};

// Lightweight markdown renderer — handles **bold**, *italic*, and - lists
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    result.push(
      <ul key={key} className="list-disc list-inside space-y-0.5 my-1 pl-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const listMatch = line.match(/^[-*•]\s+(.+)/);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
    } else {
      flushList(`list-${idx}`);
      if (line.trim() === "") {
        if (result.length > 0) result.push(<span key={`br-${idx}`} className="block h-1" />);
      } else {
        result.push(
          <span key={`line-${idx}`} className="block leading-relaxed">
            {renderInline(line)}
          </span>,
        );
      }
    }
  });
  flushList("list-end");
  return result;
}

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function IconChat({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSend({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function AssistantAvatar() {
  return (
    <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
      <IconChat size={13} className="text-primary" />
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export function FAQChatbot({ audience, suggestions = [], userContext }: Props) {
  const { t } = useTranslation();
  const GREETINGS: Record<ChatAudience, string> = {
    advertiser: t("faq_chatbot.greeting_annonceur"),
    owner: t("faq_chatbot.greeting_proprietaire"),
    partner: t("faq_chatbot.greeting_partenaire"),
    provider: t("faq_chatbot.greeting_prestataire"),
  };
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/faq-chat",
      body: { audience, userContext },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const lastRole = messages[messages.length - 1]?.role;

  // Badge de notification quand le chatbot est fermé et qu'une réponse arrive
  useEffect(() => {
    if (!open && lastRole === "assistant" && messages.length > 0) {
      setHasUnread(true);
    }
  }, [messages.length, lastRole, open]);

  useEffect(() => {
    if (open) setHasUnread(false);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Fermer avec Échap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        aria-label={open ? t("faq_chatbot.aria_close") : t("faq_chatbot.aria_open")}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-elevated transition-all duration-200 flex items-center justify-center ${
          open
            ? "bg-secondary border border-border text-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-glow"
        }`}
      >
        {open ? <IconClose size={18} /> : <IconChat size={22} />}
        {!open && hasUnread && (
          <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] max-h-[72vh] rounded-2xl border border-border bg-card shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <IconChat size={16} className="text-primary" />
              </div>
              <div>
                <div className="font-display font-semibold text-sm leading-tight">
                  {t("faq_chatbot.header_title")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t("faq_chatbot.header_subtitle")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  title={t("faq_chatbot.btn_new_title")}
                  onClick={() => {
                    setMessages([]);
                    setInput("");
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-muted"
                >
                  {t("faq_chatbot.btn_clear")}
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
                <span className="text-[11px] text-muted-foreground">
                  {t("faq_chatbot.status_online")}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm min-h-0"
          >
            {/* Initial greeting + suggestions */}
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <AssistantAvatar />
                  <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-foreground max-w-[85%] leading-relaxed">
                    {GREETINGS[audience]}
                  </div>
                </div>
                {suggestions.length > 0 && (
                  <div className="pl-9 flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-left rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isUser && <AssistantAvatar />}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm ${
                      isUser
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-secondary text-foreground"
                    }`}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap leading-relaxed">{text}</span>
                    ) : (
                      <div className="space-y-0.5">{renderMarkdown(text)}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <AssistantAvatar />
                <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {t("faq_chatbot.error_msg")}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-border p-3 flex gap-2 bg-background/40 flex-shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("faq_chatbot.placeholder")}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label={t("faq_chatbot.aria_send")}
              className="rounded-full bg-primary text-primary-foreground h-9 w-9 flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-40 flex-shrink-0"
            >
              <IconSend size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
