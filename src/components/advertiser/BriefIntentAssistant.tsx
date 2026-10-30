import { useState } from "react";
import { Sparkles, ChevronRight, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { supabase } from "@/integrations/supabase/client";
import { synthesizeQuoteBrief } from "@/lib/ai/quote-brief-assistant.functions";
import { MockupPreview } from "./MockupPreview";

type Question = {
  id: string;
  label: string;
  type: "chips" | "text" | "text-optional";
  options?: string[];
  placeholder?: string;
};

const QUESTIONS: Record<string, Question[]> = {
  covering_vehicule: [
    {
      id: "message",
      label: "Quel est le message principal de votre campagne ?",
      type: "text",
      placeholder: "Ex. Lancement de notre nouvelle gamme de sauces artisanales",
    },
    {
      id: "ton",
      label: "Quel ton souhaitez-vous ?",
      type: "chips",
      options: ["Sérieux & Pro", "Dynamique & Fun", "Luxe & Premium", "Ludique & Coloré"],
    },
    {
      id: "logo",
      label: "Avez-vous un logo ou visuel à intégrer ?",
      type: "chips",
      options: ["Oui, je le fournirai", "Non, à créer"],
    },
    {
      id: "couleurs",
      label: "Des couleurs imposées ? (optionnel)",
      type: "text-optional",
      placeholder: "Ex. Bleu marine et or",
    },
    {
      id: "contraintes",
      label: "Des contraintes particulières ? (optionnel)",
      type: "text-optional",
      placeholder: "Ex. Pas de personnages, texte en français uniquement",
    },
  ],
  creation_graphique: [
    {
      id: "support",
      label: "Quel support final ?",
      type: "chips",
      options: ["Flyer / Affiche", "Vitrophanie", "Covering complet", "Carte de visite", "Autre"],
    },
    {
      id: "style",
      label: "Style graphique souhaité ?",
      type: "chips",
      options: ["Épuré & Moderne", "Coloré & Impact", "Corporate", "Vintage / Rétro"],
    },
    {
      id: "infos",
      label: "Informations clés à faire apparaître ?",
      type: "text",
      placeholder: "Ex. Nom de marque, slogan, numéro de téléphone, QR code",
    },
    {
      id: "references",
      label: "Des références visuelles ? (optionnel)",
      type: "text-optional",
      placeholder: "Ex. Style minimaliste type Apple, couleurs vives type street art",
    },
  ],
  production_video: [
    {
      id: "format",
      label: "Format de la vidéo ?",
      type: "chips",
      options: ["Reportage terrain", "Animation", "Témoignage client", "Présentation produit"],
    },
    {
      id: "duree",
      label: "Durée souhaitée ?",
      type: "chips",
      options: ["30 secondes", "1 minute", "2 à 3 minutes", "À définir"],
    },
    {
      id: "contexte",
      label: "Occasion ou contexte de la vidéo ?",
      type: "text",
      placeholder: "Ex. Lancement produit, événement annuel, publicité réseaux sociaux",
    },
    {
      id: "ton",
      label: "Ton de la vidéo ?",
      type: "chips",
      options: ["Professionnel", "Dynamique", "Émotionnel", "Humoristique"],
    },
  ],
};

const DEFAULT_QUESTIONS = QUESTIONS.covering_vehicule;

type Phase = "idle" | "asking" | "loading" | "done";

type Props = {
  serviceType: string;
  vehicleType?: string;
  onResult: (message: string) => void;
  onBriefSessionCreated?: (id: string) => void;
};

export function BriefIntentAssistant({
  serviceType,
  vehicleType,
  onResult,
  onBriefSessionCreated,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [briefSessionId, setBriefSessionId] = useState<string | undefined>(undefined);
  const [briefText, setBriefText] = useState("");

  const questions = QUESTIONS[serviceType] ?? DEFAULT_QUESTIONS;
  const currentQ = questions[step];
  const isOptional = currentQ?.type === "text-optional";
  const currentAnswer = answers[currentQ?.id ?? ""] ?? "";
  const canAdvance = isOptional || currentAnswer.trim().length > 0;

  function reset() {
    setPhase("idle");
    setStep(0);
    setAnswers({});
    setError("");
    setBriefSessionId(undefined);
    setBriefText("");
  }

  function handleChip(value: string) {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.id]: value };
    setAnswers(next);
    setTimeout(() => advance(next), 180);
  }

  function handleText(value: string) {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  }

  async function advance(snapshot?: Record<string, string>) {
    const cur = snapshot ?? answers;
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      await synthesize(cur);
    }
  }

  async function synthesize(cur: Record<string, string>) {
    setPhase("loading");
    setError("");
    try {
      const session = await getOrRefreshSession();
      const filteredAnswers = Object.fromEntries(Object.entries(cur).filter(([, v]) => v.trim()));

      const result = await synthesizeQuoteBrief({
        data: {
          serviceType,
          vehicleType: vehicleType || undefined,
          answers: filteredAnswers,
          _auth: session?.access_token,
        },
      });

      if (!result.ok) {
        setError(result.message);
        setPhase("asking");
        return;
      }

      const text = result.message;
      onResult(text);
      setBriefText(text);

      // Persist AI session to ai_brief_data
      const userId = session?.user?.id;
      if (userId) {
        const { data: row } = await supabase
          .from("ai_brief_data")
          .insert({
            user_id: userId,
            service_type: serviceType,
            vehicle_type: vehicleType || null,
            answers: filteredAnswers,
            generated_text_brief: text,
          })
          .select("id")
          .single();
        if (row?.id) {
          setBriefSessionId(row.id);
          onBriefSessionCreated?.(row.id);
        }
      }

      setPhase("done");
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setPhase("asking");
    }
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("asking")}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Me guider avec l'IA
      </button>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
        L'assistant synthétise votre besoin…
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-signal mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">Besoin structuré par l'IA</span>
            <span className="text-muted-foreground">
              {" "}
              — vous pouvez ajuster le texte ci-dessus.
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            Recommencer
          </button>
        </div>

        <MockupPreview
          briefText={briefText}
          serviceType={serviceType}
          vehicleType={vehicleType}
          briefSessionId={briefSessionId}
        />
      </div>
    );
  }

  // phase === "asking"
  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Assistant IA — question {step + 1}/{questions.length}
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Annuler
        </button>
      </div>

      <div className="h-1 bg-primary/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-sm font-medium leading-snug">{currentQ.label}</p>

      {currentQ.type === "chips" && currentQ.options && (
        <div className="flex flex-wrap gap-2">
          {currentQ.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleChip(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                currentAnswer === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {(currentQ.type === "text" || currentQ.type === "text-optional") && (
        <textarea
          value={currentAnswer}
          onChange={(e) => handleText(e.target.value)}
          rows={2}
          placeholder={currentQ.placeholder}
          autoFocus
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {currentQ.type !== "chips" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => advance()}
            disabled={!canAdvance}
            className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5 transition"
          >
            {step < questions.length - 1 ? (
              <>
                Suivant
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Générer la description
                <Sparkles className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          {isOptional && (
            <button
              type="button"
              onClick={() => advance()}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              Passer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
