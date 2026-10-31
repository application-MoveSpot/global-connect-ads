import { Link } from "@tanstack/react-router";
import { Sparkles, Loader2, TrendingUp, Eye, Star, Zap } from "lucide-react";
import { useAiCampaignEstimator, type Sector, type City } from "@/hooks/useAiCampaignEstimator";
import { cn } from "@/lib/utils";

// ── Static data ───────────────────────────────────────────────────────────────

const SECTORS: { id: Sector; label: string; emoji: string }[] = [
  { id: "retail", label: "Commerce", emoji: "🛍️" },
  { id: "restauration", label: "Restauration", emoji: "🍽️" },
  { id: "immobilier", label: "Immobilier", emoji: "🏠" },
  { id: "tech", label: "Tech / SaaS", emoji: "💻" },
  { id: "evenementiel", label: "Événementiel", emoji: "🎤" },
  { id: "sante", label: "Santé", emoji: "🏥" },
];

const CITIES: { id: City; label: string; flag: string }[] = [
  { id: "paris", label: "Paris", flag: "🗼" },
  { id: "lyon", label: "Lyon", flag: "🦁" },
  { id: "marseille", label: "Marseille", flag: "⚓" },
  { id: "bordeaux", label: "Bordeaux", flag: "🍷" },
  { id: "toulouse", label: "Toulouse", flag: "🚀" },
  { id: "nantes", label: "Nantes", flag: "🐘" },
  { id: "lille", label: "Lille", flag: "🏟️" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return String(Math.round(n));
}

// Save lead context before redirecting to signup
function saveEstimatorContext(inputs: object) {
  void inputs; // unused overload — handled inline
}

// ── Sub-component: animated metric box ───────────────────────────────────────

function MetricBox({
  icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center flex flex-col items-center gap-1">
      <div className={cn("mb-1", accent)}>{icon}</div>
      <div className={cn("font-display text-xl font-bold tabular-nums leading-tight", accent)}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : value}
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug">{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiCampaignEstimator() {
  const { inputs, result, llmLoading, isReady, update } = useAiCampaignEstimator();

  const searchParams = {
    from: "estimator",
    ...(inputs.sector ? { sector: inputs.sector } : {}),
    ...(inputs.city ? { city: inputs.city } : {}),
  };

  function handleCTA() {
    try {
      localStorage.setItem("ms_estimator_inputs", JSON.stringify(inputs));
      if (result) localStorage.setItem("ms_estimator_result", JSON.stringify(result));
    } catch {
      // localStorage unavailable — proceed anyway
    }
  }

  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Sparkles className="w-4 h-4" />
            Estimateur de campagne IA
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Ajustez les curseurs — les métriques se calculent en temps réel.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Données France 2025
        </span>
      </div>

      {/* Step 1 – Sector */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">Votre secteur d'activité</p>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => update("sector", s.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                inputs.sector === s.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-background hover:bg-secondary text-foreground",
              )}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 & 3 – City + Budget in a row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* City */}
        <div>
          <label htmlFor="est-city" className="text-xs font-medium text-foreground mb-2 block">
            Ville cible
          </label>
          <select
            id="est-city"
            value={inputs.city ?? ""}
            onChange={(e) => update("city", (e.target.value as City) || null)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Choisir une ville —</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="est-budget" className="text-xs font-medium text-foreground">
              Budget mensuel
            </label>
            <span className="text-sm font-bold text-primary tabular-nums">
              {inputs.monthlyBudget.toLocaleString("fr-FR")} €/mois
            </span>
          </div>
          <input
            id="est-budget"
            type="range"
            min={100}
            max={5000}
            step={50}
            value={inputs.monthlyBudget}
            onChange={(e) => update("monthlyBudget", Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>100 €</span>
            <span>5 000 €</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox
              icon={<TrendingUp className="w-4 h-4" />}
              label="km parcourus / mois"
              value={`${fmt(result.totalKm)} km`}
              accent="text-primary"
            />
            <MetricBox
              icon={<Eye className="w-4 h-4" />}
              label="contacts visuels estimés"
              value={fmt(result.impressions)}
              accent="text-emerald-500"
            />
            <MetricBox
              icon={<Star className="w-4 h-4" />}
              label="score de campagne"
              value={`${result.relevanceScore}/100`}
              accent="text-violet-500"
              loading={llmLoading}
            />
            <MetricBox
              icon={<Zap className="w-4 h-4" />}
              label="CPM effectif"
              value={`${result.cpm.toFixed(2)} €`}
              accent="text-blue-500"
            />
          </div>

          {/* LLM insight */}
          {!llmLoading &&
            result.insight &&
            result.insight !== "Calcul de la pertinence en cours…" && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3 leading-relaxed">
                {result.insight}
              </p>
            )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/20 py-6 text-center text-xs text-muted-foreground">
          Sélectionnez un secteur et une ville pour voir votre estimation.
        </div>
      )}

      {/* CTA */}
      <Link
        to="/advertiser/inscription"
        search={searchParams}
        onClick={handleCTA}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all",
          isReady
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            : "bg-secondary text-muted-foreground pointer-events-none opacity-60",
        )}
      >
        <Sparkles className="w-4 h-4" />
        Générer mon plan média complet par IA
      </Link>
    </div>
  );
}
