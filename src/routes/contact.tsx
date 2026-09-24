import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendLeadChatMessage, type LeadData } from "@/lib/ai/lead-chat.functions";
import { submitContactLead } from "@/lib/leads/contact.functions";
import { CheckCircle2, Send, Loader2 } from "lucide-react";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: (search.plan as string) ?? "enterprise",
    form: (search.form as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Demande de devis — MoveSpot" },
      { name: "description", content: "Obtenez un devis personnalisé pour votre campagne Grand Compte MoveSpot." },
    ],
  }),
  component: ContactPage,
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant commercial de MoveSpot 👋\n\nJe suis là pour construire avec vous une offre Grand Compte sur mesure — commission négociée, account manager dédié, contrat-cadre annuel.\n\nPour commencer, pourriez-vous me donner votre prénom et nom, ainsi que le nom de votre entreprise ?",
};

function ContactPage() {
  const { form } = Route.useSearch();
  const navigate = useNavigate();

  if (form === "1") {
    return <ClassicForm onSwitchToChat={() => navigate({ to: "/contact", search: { plan: "enterprise", form: "" } })} />;
  }

  return <ChatPage />;
}

function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const doChat = useServerFn(sendLeadChatMessage);
  const doSubmit = useServerFn(submitContactLead);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || done) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const result = await doChat({
        data: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      }

      if (result.done && result.leadData) {
        setDone(true);
        await submitLeadData(result.leadData);
      }
    } catch {
      setError("Une erreur est survenue. Réessayez ou écrivez-nous à contact@move-spot.com");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const submitLeadData = async (leadData: LeadData) => {
    try {
      await doSubmit({
        data: {
          plan: "enterprise",
          contact_name: leadData.contact_name ?? "Prospect",
          email: leadData.email ?? "",
          company_name: leadData.company_name ?? undefined,
          phone: leadData.phone ?? undefined,
          budget_range: leadData.budget_range ?? undefined,
          message: leadData.message ?? undefined,
        },
      });
    } catch {
      // Lead submission failure is non-blocking — the conversation already confirmed to the user
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            Grande entreprise · Sur devis
          </span>
        </div>
      </header>


      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6 gap-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold">Construisons votre offre ensemble</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notre assistant vous pose quelques questions, puis notre équipe vous recontacte sous 24h ouvrées.
          </p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4 space-y-4 min-h-[380px] max-h-[520px]">
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>En train d'écrire…</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Demande transmise avec succès</p>
                <p className="text-xs text-muted-foreground mt-0.5">Un email de confirmation vient de vous être envoyé.</p>
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!done && (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="Votre message… (Entrée pour envoyer)"
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[#F05A28] text-white p-3 hover:bg-[#d94e20] transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Envoyer"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )}

        {done && (
          <div className="text-center">
            <Link to="/" className="text-sm text-primary hover:underline">← Retour à l'accueil</Link>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Préférez-vous un formulaire classique ?{" "}
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => navigate({ to: "/contact", search: { plan: "enterprise", form: "1" } })}
          >
            Cliquez ici
          </button>
          {" "}— ou écrivez-nous à{" "}
          <a href="mailto:contact@move-spot.com" className="underline hover:text-foreground">contact@move-spot.com</a>
        </p>
      </main>
    </div>
  );
}

function ClassicForm({ onSwitchToChat }: { onSwitchToChat: () => void }) {
  const doSubmit = useServerFn(submitContactLead);
  const [fields, setFields] = useState({ name: "", email: "", company: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.name.trim() || !fields.email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await doSubmit({
        data: {
          plan: "enterprise",
          contact_name: fields.name,
          email: fields.email,
          company_name: fields.company || undefined,
          phone: fields.phone || undefined,
          message: fields.message || undefined,
        },
      });
      setDone(true);
    } catch {
      setError("Une erreur est survenue. Écrivez-nous à contact@move-spot.com");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            Grande entreprise · Sur devis
          </span>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Formulaire de contact</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Remplissez ce formulaire et notre équipe vous répond sous 24h ouvrées.
          </p>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 w-full max-w-md">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Demande envoyée avec succès</p>
                <p className="text-xs text-muted-foreground mt-0.5">Un email de confirmation vient de vous être envoyé.</p>
              </div>
            </div>
            <Link to="/" className="text-sm text-primary hover:underline">← Retour à l'accueil</Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-lg mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Nom complet *</label>
                <input
                  type="text" required value={fields.name}
                  onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Sophie Martin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email professionnel *</label>
                <input
                  type="email" required value={fields.email}
                  onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="sophie@entreprise.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Entreprise</label>
                <input
                  type="text" value={fields.company}
                  onChange={(e) => setFields((f) => ({ ...f, company: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Caraïbes Distribution"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Téléphone</label>
                <input
                  type="tel" value={fields.phone}
                  onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Votre projet</label>
              <textarea
                rows={4} value={fields.message}
                onChange={(e) => setFields((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Décrivez votre campagne, vos objectifs, votre budget…"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{error}</p>}
            <button
              type="submit" disabled={loading || !fields.name.trim() || !fields.email.trim()}
              className="w-full rounded-xl bg-[#F05A28] text-white py-3 text-sm font-semibold hover:bg-[#d94e20] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer ma demande
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Préférez-vous notre assistant IA ?{" "}
              <button type="button" className="underline hover:text-foreground" onClick={onSwitchToChat}>
                Démarrer le chat
              </button>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#F05A28] flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-0.5">
          M
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
