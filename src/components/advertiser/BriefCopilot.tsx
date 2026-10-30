import { useState, useCallback } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { optimizeBriefDescription, type CopilotResult } from "@/lib/ai/brief-copilot.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  description: string;
  vehicleTypes?: string[];
  adFormat?: string | null;
  onApplyDescription: (text: string) => void;
  onApplyAudience: (text: string) => void;
  onApplyVehicles: (vehicles: string[]) => void;
}

type State = "idle" | "loading" | "result" | "error";

// ── Vehicle label map ─────────────────────────────────────────────────────────

const VEHICLE_LABELS: Record<string, string> = {
  camion_led: "Camion LED",
  food_truck: "Food truck",
  van: "Van",
  taxi: "Taxi",
  scooter: "Scooter",
  velo_cargo: "Vélo cargo",
  velo_remorque: "Vélo remorque",
  triporteur: "Triporteur",
  tutuk: "Tuktuk",
  voiture: "Voiture",
  autre: "Autre",
};

// ── Apply button ──────────────────────────────────────────────────────────────

function ApplyButton({
  applied,
  onClick,
  label = "Appliquer au brief",
}: {
  applied: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={applied}
      className={cn(
        "flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 transition-all",
        applied
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
          : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20",
      )}
    >
      {applied ? (
        <>
          <Check className="w-3 h-3" />
          Appliqué
        </>
      ) : (
        label
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BriefCopilot({
  description,
  vehicleTypes,
  adFormat,
  onApplyDescription,
  onApplyAudience,
  onApplyVehicles,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  const canOptimize = description.length >= 20;

  const optimize = useCallback(async () => {
    if (!canOptimize) return;
    setState("loading");
    setAppliedFields(new Set());
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const data = await optimizeBriefDescription({
        data: {
          description,
          vehicleTypes: vehicleTypes ?? [],
          adFormat: adFormat ?? undefined,
          _auth: token,
        },
      });
      setResult(data);
      setState(data.ok ? "result" : "error");
    } catch {
      setResult({ ok: false, message: "Erreur inattendue. Réessayez." });
      setState("error");
    }
  }, [canOptimize, description, vehicleTypes, adFormat]);

  function applyField(field: string, fn: () => void) {
    fn();
    setAppliedFields((prev) => new Set([...prev, field]));
  }

  function reset() {
    setState("idle");
    setResult(null);
    setAppliedFields(new Set());
  }

  return (
    <div className="mt-2 space-y-3">
      {/* Trigger button */}
      {state === "idle" && (
        <button
          type="button"
          onClick={optimize}
          disabled={!canOptimize}
          title={!canOptimize ? "Saisissez au moins 20 caractères" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            canOptimize
              ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground border border-border cursor-not-allowed opacity-60",
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Optimiser par IA
        </button>
      )}

      {/* Skeleton while loading */}
      {state === "loading" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-xs font-medium text-primary">Analyse du brief en cours…</span>
          </div>
          <div className="space-y-2 animate-pulse">
            <div className="h-2.5 bg-primary/15 rounded w-full" />
            <div className="h-2.5 bg-primary/15 rounded w-5/6" />
            <div className="h-2.5 bg-primary/15 rounded w-4/6" />
          </div>
          <div className="h-2.5 bg-primary/10 rounded w-3/4 animate-pulse" />
          <div className="flex gap-1.5 animate-pulse">
            <div className="h-6 w-20 bg-primary/10 rounded-full" />
            <div className="h-6 w-16 bg-primary/10 rounded-full" />
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && result && !result.ok && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <X className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="flex-1 min-w-0 text-xs text-destructive">{result.message}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Result card */}
      {state === "result" && result?.ok && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Brief Copilot</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Fermer
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Description optimisée
            </p>
            <p className="text-xs text-foreground leading-relaxed rounded-lg bg-background border border-border px-3 py-2">
              {result.description}
            </p>
            <ApplyButton
              applied={appliedFields.has("description")}
              onClick={() =>
                applyField("description", () => onApplyDescription(result.description))
              }
            />
          </div>

          {/* Audience */}
          {result.audience && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Audience cible
              </p>
              <p className="text-xs text-foreground leading-relaxed rounded-lg bg-background border border-border px-3 py-2">
                {result.audience}
              </p>
              <ApplyButton
                applied={appliedFields.has("audience")}
                onClick={() => applyField("audience", () => onApplyAudience(result.audience))}
              />
            </div>
          )}

          {/* Suggested vehicles */}
          {result.suggestedVehicles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Véhicules suggérés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedVehicles.map((v) => (
                  <span
                    key={v}
                    className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5"
                  >
                    {VEHICLE_LABELS[v] ?? v}
                  </span>
                ))}
              </div>
              <ApplyButton
                applied={appliedFields.has("vehicles")}
                onClick={() =>
                  applyField("vehicles", () => onApplyVehicles(result.suggestedVehicles))
                }
                label="Appliquer les véhicules"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
