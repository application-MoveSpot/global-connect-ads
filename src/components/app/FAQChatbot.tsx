import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

type Props = {
  audience: "proprietaire" | "annonceur" | "partenaire";
  suggestions?: string[];
};

export function FAQChatbot({ audience, suggestions = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/faq-chat",
      body: { audience },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        aria-label={open ? "Fermer l'assistant FAQ" : "Ouvrir l'assistant FAQ"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 transition flex items-center justify-center text-2xl"
      >
        {open ? "×" : "💬"}
      </button>

      {/* Panneau */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-gradient-hero/40">
            <div className="font-display font-bold">Assistant MoveSpot</div>
            <div className="text-xs text-muted-foreground">
              Posez votre question — réponse instantanée
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Bonjour 👋 Je suis l'assistant FAQ de MoveSpot. Comment puis-je vous aider ?
                </p>
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-left rounded-lg border border-border bg-background/50 px-3 py-2 text-xs hover:bg-background transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      isUser
                        ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 max-w-[85%] whitespace-pre-wrap"
                        : "rounded-2xl rounded-bl-sm bg-muted text-foreground px-3 py-2 max-w-[85%] whitespace-pre-wrap"
                    }
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-muted-foreground text-xs">
                  L'assistant réfléchit…
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive">
                Une erreur est survenue. Réessayez dans un instant.
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-border p-3 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </>
  );
}
