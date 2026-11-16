import { useState, useCallback, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, MapPin, Car, TrendingUp, Zap, ChevronRight, Globe, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  calculateCampaignImpact,
  calculateBudgetFromVehicles,
  CITY_CONFIG,
  VEHICLE_CONFIG,
  type SimCity,
  type SimVehicle,
} from "@/lib/simulation/campaign-impact";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cn } from "@/lib/utils";

// ── Static lists ──────────────────────────────────────────────────────────────

const CITIES: { id: SimCity; flag: React.ReactNode }[] = [
  { id: "paris", flag: "🗼" },
  { id: "lyon", flag: "🦁" },
  { id: "marseille", flag: "⚓" },
  { id: "france", flag: <Globe className="w-4 h-4" /> },
];

const VEHICLES: { id: SimVehicle; icon: string }[] = [
  { id: "urbains", icon: "🛵" },
  { id: "eco", icon: "⚡" },
  { id: "premium", icon: "💎" },
  { id: "mixte", icon: "🚗" },
];

const MIN_BUDGET = 100;
const MAX_BUDGET = 10_000;
const BUDGET_STEP = 100;
const MIN_VEHICLES = 1;
const MAX_VEHICLES = 30;

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtImpressions(n: number): string {
  return n.toLocaleString("fr-FR");
}

function fmtKm(n: number): string {
  return `${n.toLocaleString("fr-FR")} km`;
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

function CpmBadge({ cpm, t }: { cpm: number; t: (k: string) => string }) {
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
      {t("sim.cpm_label")} : {display} €
      <span className="opacity-60">
        · {isGood ? t("sim.cpm_excellent") : t("sim.cpm_good")}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignImpactSimulator() {
  const { t } = useTranslation();
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

  // Vehicle stepper: derive budget from vehicle count (inverse calculation)
  const handleVehicleStep = useCallback(
    (delta: number) => {
      const impact = calculateCampaignImpact(city, vehicle, committedBudget);
      const nextVehicles = Math.min(
        MAX_VEHICLES,
        Math.max(MIN_VEHICLES, impact.activeVehicles + delta),
      );
      const nextBudget = calculateBudgetFromVehicles(city, vehicle, nextVehicles);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSliderBudget(nextBudget);
      setCommittedBudget(nextBudget);
    },
    [city, vehicle, committedBudget],
  );

  const impact = calculateCampaignImpact(city, vehicle, committedBudget);
  const atMinVehicles = impact.activeVehicles <= MIN_VEHICLES;
  const atMaxVehicles = impact.activeVehicles >= MAX_VEHICLES;

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
            {t("sim.title")}
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">{t("sim.desc")}</p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {t("sim.data_badge")}
        </span>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* City selector */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {t("sim.city_label")}
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
            {t("sim.vehicle_label")}
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
                <p className="text-[10px] opacity-70 leading-snug">
                  {t(`sim.vehicle_desc_${v.id}`)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Budget ↔ Vehicles — bidirectional controls */}
      <div className="grid sm:grid-cols-2 gap-4 items-end">
        {/* Budget slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="sim-budget" className="text-xs font-medium text-foreground">
              {t("sim.budget_label")}
            </label>
            <span className="text-lg font-bold text-primary tabular-nums">
              {sliderBudget.toLocaleString("fr-FR")} €/mois
            </span>
          </div>
          <input
            id="sim-budget"
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={BUDGET_STEP}
            value={sliderBudget}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{MIN_BUDGET} €</span>
            <span>{MAX_BUDGET.toLocaleString("fr-FR")} €</span>
          </div>
        </div>

        {/* Vehicle stepper */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-violet-400" />
            {t("sim.vehicles_stepper_label")}
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleVehicleStep(-1)}
              disabled={atMinVehicles}
              aria-label={t("sim.vehicles_decrement")}
              className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                atMinVehicles
                  ? "border-border text-muted-foreground/40 cursor-not-allowed"
                  : "border-violet-500/40 text-violet-400 hover:bg-violet-500/15 active:scale-95",
              )}
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="font-display text-3xl font-bold text-violet-400 tabular-nums">
                {impact.activeVehicles}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">{t("sim.vehicles_unit")}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t("sim.vehicles_range", { min: MIN_VEHICLES, max: MAX_VEHICLES })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleVehicleStep(+1)}
              disabled={atMaxVehicles}
              aria-label={t("sim.vehicles_increment")}
              className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                atMaxVehicles
                  ? "border-border text-muted-foreground/40 cursor-not-allowed"
                  : "border-violet-500/40 text-violet-400 hover:bg-violet-500/15 active:scale-95",
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-center text-muted-foreground">
            {t("sim.vehicles_hint")}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="flex flex-wrap gap-3">
        <MetricCard
          icon={<Eye className="w-4 h-4" />}
          label={t("sim.metric_impressions")}
          rawValue={impact.impressionsCount}
          formatter={fmtImpressions}
          accent="text-primary"
        />
        <MetricCard
          icon={<span className="text-sm">📍</span>}
          label={t("sim.metric_km")}
          rawValue={impact.kmCovered}
          formatter={fmtKm}
          accent="text-emerald-400"
        />
        <MetricCard
          icon={<Car className="w-4 h-4" />}
          label={t("sim.metric_vehicles")}
          rawValue={impact.activeVehicles}
          formatter={(n) => String(n)}
          unit={` ${t("sim.vehicles_unit")}`}
          accent="text-violet-400"
        />
      </div>

      {/* CPM badge */}
      <div className="flex flex-wrap items-center gap-3">
        <CpmBadge cpm={impact.cpmEffectif} t={t} />
        <span className="text-[11px] text-muted-foreground">
          ≈ {VEHICLE_CONFIG[vehicle].avgKmPerDay} km/j {t("sim.cpm_per_vehicle")} ·{" "}
          {CITY_CONFIG[city].passerbyPerKm} {t("sim.cpm_contacts_per_km")} {CITY_CONFIG[city].label}
        </span>
      </div>

      {/* CTA */}
      <Link
        to="/advertiser/inscription"
        search={{ from: "simulator", city, vehicle }}
        onClick={handleCTA}
        className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all group"
      >
        {t("sim.cta")}
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
