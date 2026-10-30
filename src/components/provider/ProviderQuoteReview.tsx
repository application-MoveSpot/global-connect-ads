import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  Sparkles,
  Wand2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { generateMockupVariation } from "@/lib/ai/mockup-variation.functions";
import { computeFeasibilityScore } from "@/lib/ai/feasibility-score.functions";
import type { FeasibilityBreakdown } from "@/lib/ai/feasibility-score.functions";
import { providerServiceLabel } from "@/lib/providers/provider-services";

// ─── Domain types ──────────────────────────────────────────────────────────────

type AiBriefData = {
  id: string;
  service_type: string;
  vehicle_type: string | null;
  answers: Record<string, string>;
  generated_text_brief: string | null;
  mockup_url: string | null;
  mockup_prompt: string | null;
  regeneration_count: number;
};

export type QuoteWithBrief = {
  id: string;
  service_type: string;
  vehicle_type: string | null;
  message: string;
  format: string | null;
  quantity: number | null;
  deadline: string | null;
  zone: string | null;
  created_at: string;
  ai_brief_id: string | null;
};

type ProviderProfile = {
  services: string[] | null;
  description: string | null;
  company: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_LABELS: Record<string, string> = {
  message: "Message principal",
  ton: "Ton souhaité",
  logo: "Logo / visuel",
  couleurs: "Couleurs imposées",
  contraintes: "Contraintes particulières",
  support: "Support final",
  style: "Style graphique",
  infos: "Informations clés",
  references: "Références visuelles",
  format: "Format de la vidéo",
  duree: "Durée souhaitée",
  contexte: "Contexte / occasion",
};

const VEHICLE_LABELS: Record<string, string> = {
  taxi: "Taxi",
  vtc: "VTC",
  camionnette: "Camionnette",
  moto: "Moto",
  trottinette: "Trottinette",
  bus: "Bus",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
      <Sparkles className="w-2.5 h-2.5" />
      IA
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-destructive";
  return (
    <div className={`font-display text-3xl font-bold tabular-nums ${color}`}>
      {score}
      <span className="text-sm font-normal text-muted-foreground">/100</span>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
      )}
      <span className={ok ? "text-foreground" : "text-destructive"}>{label}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  quote: QuoteWithBrief;
  providerProfile: ProviderProfile;
};

export function ProviderQuoteReview({ quote, providerProfile }: Props) {
  // Brief data
  const [aiBrief, setAiBrief] = useState<AiBriefData | null>(null);
  const [briefLoading, setBriefLoading] = useState(!!quote.ai_brief_id);
  const [journalOpen, setJournalOpen] = useState(false);

  // Mockup variations
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [variationPrompt, setVariationPrompt] = useState("");
  const [varPhase, setVarPhase] = useState<"idle" | "loading" | "error">("idle");
  const [varError, setVarError] = useState("");

  // Feasibility
  const [feasibility, setFeasibility] = useState<FeasibilityBreakdown | null>(null);
  const [feasLoading, setFeasLoading] = useState(false);

  // ── Fetch ai_brief_data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!quote.ai_brief_id) return;
    supabase
      .from("ai_brief_data")
      .select("*")
      .eq("id", quote.ai_brief_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAiBrief(data as AiBriefData);
          setActiveImageUrl((data as AiBriefData).mockup_url ?? "");
        }
        setBriefLoading(false);
      });
  }, [quote.ai_brief_id]);

  // ── Auto-compute feasibility once brief is loaded ──────────────────────────
  useEffect(() => {
    if (!aiBrief) return;
    setFeasLoading(true);
    computeFeasibilityScore({
      data: {
        serviceType: quote.service_type,
        vehicleType: quote.vehicle_type ?? undefined,
        answers: aiBrief.answers,
        providerServices: providerProfile.services ?? [],
        providerDescription: providerProfile.description ?? undefined,
      },
    })
      .then((res) => {
        if (res.ok) setFeasibility(res.data);
      })
      .finally(() => setFeasLoading(false));
  }, [aiBrief, quote.service_type, quote.vehicle_type, providerProfile]);

  // ── Generate variation ─────────────────────────────────────────────────────
  async function handleVariation() {
    if (!variationPrompt.trim() || !activeImageUrl) return;
    setVarPhase("loading");
    setVarError("");
    try {
      const session = await getOrRefreshSession();
      const result = await generateMockupVariation({
        data: {
          baseImageUrl: activeImageUrl,
          adjustmentPrompt: variationPrompt.trim(),
          basePrompt: aiBrief?.mockup_prompt ?? undefined,
          briefSessionId: aiBrief?.id,
          _auth: session?.access_token,
        },
      });
      if (result.ok) {
        setActiveImageUrl(result.imageUrl);
        setVariationPrompt("");
        setVarPhase("idle");
      } else {
        setVarError(result.message);
        setVarPhase("error");
      }
    } catch {
      setVarError("Une erreur est survenue. Réessayez.");
      setVarPhase("error");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const hasAiContent = !!quote.ai_brief_id;
  const vehicleLabel = quote.vehicle_type
    ? (VEHICLE_LABELS[quote.vehicle_type] ?? quote.vehicle_type)
    : null;

  return (
    <div className="space-y-5">
      {/* Header chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-primary/30 bg-primary/5 text-primary px-2.5 py-1 font-medium">
          {providerServiceLabel(quote.service_type)}
        </span>
        {vehicleLabel && (
          <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground">
            {vehicleLabel}
          </span>
        )}
        {hasAiContent && <AiBadge />}
        <span className="ml-auto text-muted-foreground">
          {new Date(quote.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* ── Section 1 : Brief Augmenté ─────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Brief client
        </h3>

        {briefLoading ? (
          <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 animate-pulse h-20" />
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {aiBrief?.generated_text_brief ?? quote.message}
          </div>
        )}

        {/* Journal de l'assistant */}
        {aiBrief && Object.keys(aiBrief.answers).length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setJournalOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              {journalOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              Journal de l'assistant IA ({Object.keys(aiBrief.answers).length} réponses)
            </button>

            {journalOpen && (
              <div className="mt-2 rounded-xl border border-primary/15 bg-primary/5 divide-y divide-primary/10 overflow-hidden">
                {Object.entries(aiBrief.answers)
                  .filter(([, v]) => v?.trim())
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="px-4 py-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs"
                    >
                      <span className="text-muted-foreground font-medium pt-px">
                        {QUESTION_LABELS[key] ?? key}
                      </span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Section 2 : Mockup & Variations ───────────────────────────────── */}
      {hasAiContent && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
            Mockup d'intention
            {aiBrief && <AiBadge />}
          </h3>

          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            {/* Mockup image */}
            <div>
              {briefLoading || !activeImageUrl ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 aspect-square flex items-center justify-center text-muted-foreground text-xs gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {briefLoading ? "Chargement…" : "Aucun mockup généré"}
                </div>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-border">
                  <img
                    src={activeImageUrl}
                    alt="Mockup d'intention IA"
                    className="w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(activeImageUrl)}
                    className="absolute top-2 right-2 rounded-lg bg-black/50 text-white p-1.5 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Plein écran"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Variation panel */}
            {activeImageUrl && (
              <div className="w-full sm:w-56 shrink-0 rounded-xl border border-border bg-card p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                  Variations IA
                </div>
                <textarea
                  value={variationPrompt}
                  onChange={(e) => setVariationPrompt(e.target.value)}
                  rows={3}
                  placeholder="Ex. Fond rouge vif, texte plus grand, style premium…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={varPhase === "loading"}
                />
                {varPhase === "error" && <p className="text-[11px] text-destructive">{varError}</p>}
                <button
                  type="button"
                  onClick={handleVariation}
                  disabled={!variationPrompt.trim() || varPhase === "loading"}
                  className="w-full rounded-lg bg-primary text-primary-foreground py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-1.5 transition"
                >
                  {varPhase === "loading" ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3" />
                      Générer la variation
                    </>
                  )}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Flux General · image-to-image
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 3 : Analyse de faisabilité ────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Analyse de faisabilité
        </h3>

        {feasLoading || (!feasibility && hasAiContent) ? (
          <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            Analyse IA en cours…
          </div>
        ) : feasibility ? (
          <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-3">
            <div className="flex items-center gap-4">
              <ScoreRing score={feasibility.score} />
              {/* Progress bar */}
              <div className="flex-1 space-y-1">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      feasibility.score >= 75
                        ? "bg-emerald-500"
                        : feasibility.score >= 50
                          ? "bg-amber-500"
                          : "bg-destructive"
                    }`}
                    style={{ width: `${feasibility.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Score de cohérence IA</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-2 pt-1">
              <CheckRow ok={feasibility.vehicleCompatible} label="Véhicule compatible" />
              <CheckRow ok={feasibility.constraintsFeasible} label="Contraintes faisables" />
              <CheckRow ok={feasibility.skillsMatch} label="Compétences requises" />
            </div>

            {feasibility.notes.length > 0 && (
              <div className="pt-1 space-y-1">
                {feasibility.notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    {note}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
            Disponible uniquement pour les devis générés via l'assistant IA.
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Aperçu plein écran"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
