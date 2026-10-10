import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  estimateAdvertiserBudget,
  type AdvertiserBudgetEstimate,
} from "@/lib/campaigns/advertiser-budget-estimate.functions";

const ZONE_LABELS: Record<string, string> = {
  paris:        "Paris / Île-de-France",
  grande_ville: "Grande ville",
  province:     "Province",
  dom:          "DOM",
};

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type Props = {
  zones: string;
  days: number;
  vehicleCount: number;
  vehicleTypes: string[];
  brandName?: string;
  className?: string;
};

export function AdvertiserBudgetEstimate({
  zones,
  days,
  vehicleCount,
  vehicleTypes,
  brandName,
  className,
}: Props) {
  const doEstimate = useServerFn(estimateAdvertiserBudget);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvertiserBudgetEstimate | null>(null);
  const [error, setError] = useState("");
  const [needsCovering, setNeedsCovering] = useState(true);
  const [needsGraphic, setNeedsGraphic] = useState(false);
  const [needsVideo, setNeedsVideo] = useState(false);
  const [open, setOpen] = useState(false);

  const canEstimate = days >= 1 && vehicleCount >= 1;

  const handleEstimate = async () => {
    if (!canEstimate) return;
    setLoading(true);
    setError("");
    try {
      const res = await doEstimate({
        data: { zones, days, vehicleCount, vehicleTypes, needsCovering, needsGraphic, needsVideo, brandName },
      });
      setResult(res);
      setOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'estimation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => result ? setOpen((o) => !o) : handleEstimate()}
        disabled={loading || !canEstimate}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left disabled:opacity-40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {result ? "Estimation IA complète" : "Estimer mon budget avec l'IA"}
            </p>
            {!result && (
              <p className="text-xs text-muted-foreground">
                Location + covering + création — fourchette complète
              </p>
            )}
            {result && !open && (
              <p className="text-xs text-muted-foreground font-medium">
                {eur(result.totalMin)} – {eur(result.totalMax)} · {eur(result.perDayMin)}/j
              </p>
            )}
          </div>
        </div>
        {result && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />)}
      </button>

      {/* Options before first estimate */}
      {!result && (
        <div className="border-t border-border px-5 py-3 flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={needsCovering}
              onChange={(e) => setNeedsCovering(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Covering / flocage
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={needsGraphic}
              onChange={(e) => setNeedsGraphic(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Création graphique
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={needsVideo}
              onChange={(e) => setNeedsVideo(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Production vidéo
          </label>
        </div>
      )}

      {error && (
        <p className="px-5 pb-4 text-xs text-destructive">{error}</p>
      )}

      {/* Result panel */}
      {result && open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Zone tag */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2 py-0.5 font-medium">
              📍 {ZONE_LABELS[result.zone] ?? result.zone}
            </span>
            <span>{days} jour{days > 1 ? "s" : ""} · {vehicleCount} véhicule{vehicleCount > 1 ? "s" : ""}</span>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5">
            {result.lines.map((line, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">{line.label}</span>
                  {line.note && (
                    <span className="ml-1.5 text-xs text-muted-foreground">{line.note}</span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {eur(line.min)} – {eur(line.max)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-primary/8 border border-primary/20 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Budget total estimé</p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {eur(result.totalMin)} – {eur(result.totalMax)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Par jour</p>
              <p className="text-sm font-semibold tabular-nums">
                {eur(result.perDayMin)} – {eur(result.perDayMax)}
              </p>
            </div>
          </div>

          {/* AI recommendation */}
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm leading-relaxed">
            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Conseil IA
            </p>
            <p className="text-muted-foreground">{result.aiRecommendation}</p>
          </div>

          {/* Refine button */}
          <button
            type="button"
            onClick={handleEstimate}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-40"
          >
            {loading ? "Recalcul en cours…" : "Recalculer"}
          </button>
        </div>
      )}
    </div>
  );
}
