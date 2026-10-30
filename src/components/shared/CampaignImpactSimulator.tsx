import { useState, useCallback, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, MapPin, Car, TrendingUp, Zap, ChevronRight } from "lucide-react";
import {
  calculateCampaignImpact,
  CITY_CONFIG,
  VEHICLE_CONFIG,
  type SimCity,
  type SimVehicle,
} from "@/lib/simulation/campaign-impact";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cn } from "@/lib/utils";

// ── Static lists ──────────────────────────────────────────────────────────────

const CITIES: { id: SimCity; flag: string }[] = [
  { id: "paris", flag: "🗼" },
  { id: "lyon", flag: "🦁" },
  { id: "marseille", flag: "⚓" },
  { id: "france", flag: "🇫🇷" },
];

const VEHICLES: { id: SimVehicle; icon: string; desc: string }[] = [
  { id: "urbains", icon: "🛵", desc: "Food trucks, scooters, vélos cargo" },
  { id: "eco", icon: "⚡", desc: "Berlines électriques & hybrides" },
  { id: "premium", icon: "💎", desc: "VTC hauts de gamme" },
  { id: "mixte", icon: "🚗", desc: "Panachage optimisé" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtImpressions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(n);
}

function fmtKm(n: number): string {
  if (n >= 1_000) return `${Math.round(n / 1_000)} k km`;
  return `${n} km`;
}

// ── Animated metric card ──────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  rawValue,
  formatter,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  rawValue: number;
  formatter: (n: number) => string;
  unit?: string;
  accent: string;
}) {
  const animated = useAnimatedNumber(rawValue);
  return (
    <div className="flex-1 min-w-[140px] rounded-2xl border border-border bg-card p-4 text-center flex flex-col items-center gap-1.5">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", accent + "/15")}>
        <span className={accent}>{icon}</span>
      </div>
      <div
        className={cn(
          "font-display text-2xl font-bold tabular-nums leading-tight transition-colors",
          accent,
        )}
      >
        {formatter(animated)}
        {unit && <span className="text-sm font-semibold ml-0.5 opacity-80">{unit}</span>}
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug max-w-[110px]">{label}</div>
    </div>
  );
}

// ── CPM badge ─────────────────────────────────────────────────────────────────

function CpmBadge({ cpm }: { cpm: number }) {
  const animated = useAnimatedNumber(Math.round(cpm * 100));
  const display = (animated / 100).toFixed(2);
  const isGood = cpm < 3;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        isGood
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/40 bg-amber-500/10 text-amber-400",
      )}
    >
      <Zap className="w-3 h-3" />
      CPM effectif : {display} €
      <span className="opacity-60">{isGood ? "· excellent" : "· bon"}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignImpactSimulator() {
  const [city, setCity] = useState<SimCity>("paris");
  const [vehicle, setVehicle] = useState<SimVehicle>("eco");
  const [sliderBudget, setSliderBudget] = useState(500);
  const [committedBudget, setCommittedBudget] = useState(500);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit budget after 100 ms idle (avoids animation storm while dragging)
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setSliderBudget(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCommittedBudget(v), 100);
  }, []);

  // Commit immediately on release (covers mouse-up)
  const handleSliderCommit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCommittedBudget(sliderBudget);
  }, [sliderBudget]);

  const impact = calculateCampaignImpact(city, vehicle, committedBudget);

  function handleCTA() {
    try {
      localStorage.setItem(
        "ms_simulator_inputs",
        JSON.stringify({ city, vehicle, budget: committedBudget }),
      );
      localStorage.setItem("ms_simulator_result", JSON.stringify(impact));
    } catch {
      // localStorage unavailable — proceed anyway
    }
  }

  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Simulateur d'impact campagne
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Ajustez la ville, le type de flotte et le budget — les métriques se mettent à jour en
            temps réel.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Données terrain France 2025
        </span>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* City selector */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Ville cible
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCity(c.id)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium border transition-all text-left flex items-center gap-2",
                  city === c.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                    : "border-border bg-background hover:bg-secondary text-foreground",
                )}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span>{CITY_CONFIG[c.id].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle type selector */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-3">
            <Car className="w-3.5 h-3.5 text-primary" />
            Type de véhicules
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicle(v.id)}
                className={cn(
                  "rounded-xl px-3 py-2.5 border transition-all text-left",
                  vehicle === v.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                    : "border-border bg-background hover:bg-secondary text-foreground",
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{v.icon}</span>
                  <span className="text-sm font-medium">{VEHICLE_CONFIG[v.id].label}</span>
                </div>
                <p className="text-[10px] opacity-70 leading-snug">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Budget slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="sim-budget" className="text-xs font-medium text-foreground">
            Budget mensuel
          </label>
          <span className="text-lg font-bold text-primary tabular-nums">
            {sliderBudget.toLocaleString("fr-FR")} €/mois
          </span>
        </div>
        <input
          id="sim-budget"
          type="range"
          min={100}
          max={10_000}
          step={100}
          value={sliderBudget}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>100 €</span>
          <span>10 000 €</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="flex flex-wrap gap-3">
        <MetricCard
          icon={<Eye className="w-4 h-4" />}
          label="contacts visuels / mois"
          rawValue={impact.impressionsCount}
          formatter={fmtImpressions}
          accent="text-primary"
        />
        <MetricCard
          icon={<span className="text-sm">📍</span>}
          label="kilomètres couverts / mois"
          rawValue={impact.kmCovered}
          formatter={fmtKm}
          accent="text-emerald-400"
        />
        <MetricCard
          icon={<Car className="w-4 h-4" />}
          label="véhicules mobilisés"
          rawValue={impact.activeVehicles}
          formatter={(n) => String(n)}
          unit=" véh."
          accent="text-violet-400"
        />
      </div>

      {/* CPM badge */}
      <div className="flex flex-wrap items-center gap-3">
        <CpmBadge cpm={impact.cpmEffectif} />
        <span className="text-[11px] text-muted-foreground">
          ≈ {VEHICLE_CONFIG[vehicle].avgKmPerDay} km/j par véhicule ·{" "}
          {CITY_CONFIG[city].passerbyPerKm} contacts/km à {CITY_CONFIG[city].label}
        </span>
      </div>

      {/* CTA */}
      <Link
        to="/advertiser/inscription"
        search={{ from: "simulator", city, vehicle }}
        onClick={handleCTA}
        className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all group"
      >
        Lancer ma campagne maintenant
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
