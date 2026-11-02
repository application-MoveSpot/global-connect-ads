import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSmartReplies, type SmartReply } from "@/lib/ai/smart-replies.functions";

type Props = {
  briefTitle: string;
  messages: Array<{ sender_role: string; body: string }>;
  onSelect: (text: string) => void;
  vehicleType?: string;
  zones?: string[];
  pricePerDay?: number;
};

const TONE_STYLES: Record<string, string> = {
  accept:
    "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  propose:
    "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  clarify: "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary",
  decline: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive",
};

export function SmartReplySuggestions({
  briefTitle,
  messages,
  onSelect,
  vehicleType,
  zones,
  pricePerDay,
}: Props) {
  const [suggestions, setSuggestions] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const callGenerate = useServerFn(generateSmartReplies);

  const lastMessages = messages.slice(-6).map((m) => ({
    role: m.sender_role as "owner" | "advertiser" | "admin",
    body: m.body.slice(0, 500),
  }));

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callGenerate({
        data: {
          briefTitle,
          lastMessages,
          context: {
            vehicleType,
            zones,
            pricePerDay,
          },
        },
      });
      setSuggestions(result);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const lastIsFromAdvertiser = messages.length > 0 && messages.at(-1)?.sender_role === "advertiser";

  if (!lastIsFromAdvertiser && !generated) return null;

  return (
    <div className="border-t border-border/50 pt-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">Suggestions IA</span>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className={cn(
            "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition",
            generated
              ? "border-border text-muted-foreground hover:bg-secondary"
              : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
          )}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : generated ? (
            <RefreshCw className="w-3 h-3" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {loading ? "Génération…" : generated ? "Regénérer" : "Générer des réponses"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      {loading && !suggestions.length && (
        <div className="flex gap-2 px-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-8 rounded-lg bg-secondary/60 animate-pulse" />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(s.body)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                TONE_STYLES[s.tone] ?? TONE_STYLES.clarify,
              )}
              title={s.body}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <p className="text-[10px] text-muted-foreground px-1">
          Cliquez sur une suggestion pour la copier dans le champ de saisie. Vous pouvez la modifier
          avant d'envoyer.
        </p>
      )}
    </div>
  );
}
