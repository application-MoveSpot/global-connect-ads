import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Sparkles, Users, Scale, Crown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────
type OpinionData = {
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  compliance_flags: string[];
  score: number;
};

type Opinion = { label: string; data: OpinionData; failed: boolean };

type PeerReviewData = {
  ranked_best: string;
  key_insights: string[];
  blind_spots: string[];
  divergence_points: string[];
};

type PeerReview = { reviewer: string; data: PeerReviewData; failed: boolean };

type ChairmanData = {
  executive_summary: string;
  synthesis: string;
  recommendations: string[];
  priority_actions: Array<{ action: string; impact: string; effort: string }>;
};

type CouncilPhase =
  | "idle"
  | "step1"
  | "step2"
  | "step3"
  | "done"
  | "error";

type CouncilState = {
  phase: CouncilPhase;
  opinions: Opinion[];
  reviews: PeerReview[];
  chairman: ChairmanData | null;
  errorMsg: string;
  briefSanitized: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBrief(fields: BriefFields): string {
  const parts: string[] = [];
  parts.push(`Titre : ${fields.title}`);
  parts.push(`Description : ${fields.description}`);
  if (fields.objective) parts.push(`Objectif : ${fields.objective}`);
  if (fields.target_audience) parts.push(`Cible : ${fields.target_audience}`);
  if (fields.zone) parts.push(`Zone géographique : ${fields.zone}`);
  if (fields.budget_eur) parts.push(`Budget estimé : ${fields.budget_eur} €`);
  if (fields.duration_days) parts.push(`Durée : ${fields.duration_days} jours`);
  return parts.join("\n");
}

const IMPACT_COLOR: Record<string, string> = {
  fort: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  moyen: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  faible: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const EFFORT_COLOR: Record<string, string> = {
  faible: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  moyen: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  fort: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

// ── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({
  number,
  label,
  icon: Icon,
  active,
  done,
}: {
  number: number;
  label: string;
  icon: React.ElementType;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground")}>
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0", done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-background" : "border-border bg-background")}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      </div>
      <span className={cn("font-medium", active && "animate-pulse")}>{label}</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    : score >= 5 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {score}/10
    </span>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border px-4 py-3">{children}</div>}
    </div>
  );
}

// ── BriefFields ──────────────────────────────────────────────────────────────
type BriefFields = {
  title: string;
  description: string;
  objective: string;
  target_audience: string;
  zone: string;
  budget_eur: string;
  duration_days: string;
};

const EMPTY_FIELDS: BriefFields = {
  title: "",
  description: "",
  objective: "",
  target_audience: "",
  zone: "",
  budget_eur: "",
  duration_days: "",
};

// ── Main component ───────────────────────────────────────────────────────────
export function LLMCouncilPanel() {
  const [fields, setFields] = useState<BriefFields>(EMPTY_FIELDS);
  const [state, setState] = useState<CouncilState>({
    phase: "idle",
    opinions: [],
    reviews: [],
    chairman: null,
    errorMsg: "",
    briefSanitized: "",
  });

  const set = (key: keyof BriefFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const isRunning = ["step1", "step2", "step3"].includes(state.phase);
  const canSubmit = fields.title.trim().length >= 3 && fields.description.trim().length >= 20 && !isRunning;

  const run = async () => {
    if (!canSubmit) return;
    const rawBrief = formatBrief(fields);

    setState({ phase: "step1", opinions: [], reviews: [], chairman: null, errorMsg: "", briefSanitized: "" });

    try {
      // ── Step 1 ────────────────────────────────────────────────────────────
      const { data: s1, error: e1 } = await supabase.functions.invoke("llm-council", {
        body: { step: 1, brief: rawBrief },
      });
      if (e1) throw new Error(e1.message ?? "Erreur étape 1");
      const opinions: Opinion[] = (s1 as { opinions: Opinion[] }).opinions;
      const briefSanitized: string = (s1 as { brief_sanitized: string }).brief_sanitized ?? rawBrief;

      setState((p) => ({ ...p, phase: "step2", opinions, briefSanitized }));

      // ── Step 2 ────────────────────────────────────────────────────────────
      const { data: s2, error: e2 } = await supabase.functions.invoke("llm-council", {
        body: { step: 2, brief: briefSanitized, opinions },
      });
      if (e2) throw new Error(e2.message ?? "Erreur étape 2");
      const reviews: PeerReview[] = (s2 as { reviews: PeerReview[] }).reviews;

      setState((p) => ({ ...p, phase: "step3", reviews }));

      // ── Step 3 ────────────────────────────────────────────────────────────
      const { data: s3, error: e3 } = await supabase.functions.invoke("llm-council", {
        body: { step: 3, brief: briefSanitized, opinions, reviews },
      });
      if (e3) throw new Error(e3.message ?? "Erreur étape 3");
      const chairman: ChairmanData = (s3 as { chairman: ChairmanData }).chairman;

      setState((p) => ({ ...p, phase: "done", chairman }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("daily_limit_exceeded")) {
        toast.error("Limite journalière atteinte. Revenez demain.");
      } else {
        toast.error("Le Conseil IA a rencontré une erreur.");
      }
      setState((p) => ({ ...p, phase: "error", errorMsg: msg }));
    }
  };

  const reset = () => setState({ phase: "idle", opinions: [], reviews: [], chairman: null, errorMsg: "", briefSanitized: "" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Conseil IA Multi-Modèles</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Soumettez votre brief à trois experts IA indépendants (Claude, GPT-4o, Gemini) pour une analyse croisée et une synthèse Chairman.
        </p>
      </div>

      {/* Form — hidden when running or done */}
      {state.phase === "idle" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Votre brief publicitaire</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Titre du brief *</label>
              <input
                value={fields.title}
                onChange={set("title")}
                placeholder="Ex : Lancement snack végétal — été 2026"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description / message principal *</label>
              <textarea
                value={fields.description}
                onChange={set("description")}
                rows={4}
                placeholder="Décrivez votre produit, le message clé, le ton voulu…"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Objectif</label>
                <input
                  value={fields.objective}
                  onChange={set("objective")}
                  placeholder="Ex : notoriété, conversion"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Cible</label>
                <input
                  value={fields.target_audience}
                  onChange={set("target_audience")}
                  placeholder="Ex : CSP+ 25-45 ans urbains"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Zone géographique</label>
                <input
                  value={fields.zone}
                  onChange={set("zone")}
                  placeholder="Ex : Paris intra-muros, Pointe-à-Pitre"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Budget estimé (€)</label>
                <input
                  type="number"
                  min={0}
                  value={fields.budget_eur}
                  onChange={set("budget_eur")}
                  placeholder="Ex : 5000"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            Lancer le Conseil IA
          </button>
        </div>
      )}

      {/* Progress */}
      {(isRunning || state.phase === "done") && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
            {isRunning ? "Conseil en cours…" : "Conseil terminé"}
          </h2>
          <div className="space-y-3">
            <StepIndicator number={1} label="Opinions des experts (Claude · GPT-4o · Gemini)" icon={Users} active={state.phase === "step1"} done={["step2", "step3", "done"].includes(state.phase)} />
            <StepIndicator number={2} label="Évaluation croisée anonyme" icon={Scale} active={state.phase === "step2"} done={["step3", "done"].includes(state.phase)} />
            <StepIndicator number={3} label="Synthèse du Chairman" icon={Crown} active={state.phase === "step3"} done={state.phase === "done"} />
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Le Conseil IA a rencontré une erreur</p>
            <p className="text-xs text-muted-foreground font-mono">{state.errorMsg}</p>
            <button type="button" onClick={reset} className="text-xs underline text-muted-foreground hover:text-foreground">
              Recommencer
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {state.phase === "done" && state.chairman && (
        <div className="space-y-4">
          {/* Chairman card */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Synthèse Chairman</h2>
            </div>
            <p className="text-sm font-medium leading-relaxed">{state.chairman.executive_summary}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{state.chairman.synthesis}</p>

            {state.chairman.priority_actions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions prioritaires</h3>
                <div className="space-y-2">
                  {state.chairman.priority_actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-background border border-border px-3 py-2">
                      <span className="text-xs font-bold text-primary mt-0.5">{i + 1}.</span>
                      <span className="flex-1 text-sm">{a.action}</span>
                      <div className="flex gap-1 shrink-0">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", IMPACT_COLOR[a.impact] ?? IMPACT_COLOR.faible)}>
                          impact {a.impact}
                        </span>
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", EFFORT_COLOR[a.effort] ?? EFFORT_COLOR.moyen)}>
                          effort {a.effort}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.chairman.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recommandations</h3>
                <ol className="space-y-1.5">
                  {state.chairman.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Individual opinions */}
          {state.opinions.length > 0 && (
            <Collapsible title={`Avis individuels des experts (${state.opinions.filter((o) => !o.failed).length}/3 disponibles)`}>
              <div className="space-y-4">
                {state.opinions.map((o) => (
                  <div key={o.label} className={cn("space-y-2", o.failed && "opacity-50")}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{o.label}</span>
                      {!o.failed && <ScoreBadge score={o.data.score} />}
                    </div>
                    <p className="text-sm text-muted-foreground">{o.data.analysis}</p>
                    {o.data.strengths.length > 0 && (
                      <ul className="space-y-0.5">
                        {o.data.strengths.map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                            <span className="font-bold">+</span> {s}
                          </li>
                        ))}
                        {o.data.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                            <span className="font-bold">−</span> {w}
                          </li>
                        ))}
                      </ul>
                    )}
                    {o.data.compliance_flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {o.data.compliance_flags.map((f, i) => (
                          <span key={i} className="rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 text-xs">
                            ⚠ {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Peer reviews */}
          {state.reviews.filter((r) => !r.failed).length > 0 && (
            <Collapsible title="Évaluations croisées">
              <div className="space-y-4">
                {state.reviews.filter((r) => !r.failed).map((r) => (
                  <div key={r.reviewer} className="space-y-2">
                    <span className="text-sm font-semibold">{r.reviewer}</span>
                    <p className="text-xs text-muted-foreground">Meilleure analyse : <strong>{r.data.ranked_best}</strong></p>
                    {r.data.key_insights.length > 0 && (
                      <ul className="space-y-0.5">
                        {r.data.key_insights.map((ins, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {ins}</li>
                        ))}
                      </ul>
                    )}
                    {r.data.blind_spots.length > 0 && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                        <span className="font-medium">Angles morts :</span>
                        {r.data.blind_spots.map((b, i) => (
                          <p key={i}>• {b}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          <button
            type="button"
            onClick={() => { reset(); setFields(EMPTY_FIELDS); }}
            className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-secondary transition"
          >
            Nouvelle analyse
          </button>
        </div>
      )}
    </div>
  );
}
