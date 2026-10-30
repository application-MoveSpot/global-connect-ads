import { useState, useEffect, useRef, useCallback } from "react";
import { estimateCampaign } from "@/lib/ai/campaign-estimator.functions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Sector =
  "retail" | "restauration" | "immobilier" | "tech" | "evenementiel" | "sante" | "autre";

export type City = "paris" | "lyon" | "marseille" | "bordeaux" | "toulouse" | "nantes" | "lille";

export type EstimatorInputs = {
  sector: Sector | null;
  city: City | null;
  monthlyBudget: number;
};

export type EstimationResult = {
  vehiclesCount: number;
  totalKm: number;
  impressions: number;
  relevanceScore: number;
  cpm: number;
  insight: string;
};

// ── City config (client-side copy for instant feedback) ───────────────────────

const CITY_CONFIG: Record<
  City,
  { avgKmPerDay: number; trafficDensity: number; avgPasserbyPerKm: number; pricePerVehicle: number }
> = {
  paris: { avgKmPerDay: 120, trafficDensity: 0.92, avgPasserbyPerKm: 210, pricePerVehicle: 85 },
  lyon: { avgKmPerDay: 95, trafficDensity: 0.72, avgPasserbyPerKm: 145, pricePerVehicle: 65 },
  marseille: { avgKmPerDay: 88, trafficDensity: 0.68, avgPasserbyPerKm: 130, pricePerVehicle: 60 },
  bordeaux: { avgKmPerDay: 80, trafficDensity: 0.61, avgPasserbyPerKm: 110, pricePerVehicle: 55 },
  toulouse: { avgKmPerDay: 82, trafficDensity: 0.63, avgPasserbyPerKm: 115, pricePerVehicle: 55 },
  nantes: { avgKmPerDay: 75, trafficDensity: 0.58, avgPasserbyPerKm: 100, pricePerVehicle: 50 },
  lille: { avgKmPerDay: 78, trafficDensity: 0.6, avgPasserbyPerKm: 105, pricePerVehicle: 52 },
};

// ── Deterministic compute (synchronous) ──────────────────────────────────────

function computeLocal(
  inputs: EstimatorInputs,
): Omit<EstimationResult, "relevanceScore" | "insight"> | null {
  if (!inputs.city) return null;
  const cfg = CITY_CONFIG[inputs.city];
  const vehiclesCount = Math.max(1, Math.floor(inputs.monthlyBudget / cfg.pricePerVehicle));
  const totalKm = vehiclesCount * cfg.avgKmPerDay * 30;
  const impressions = Math.round(totalKm * cfg.avgPasserbyPerKm * cfg.trafficDensity * 0.45);
  const cpm = impressions > 0 ? (inputs.monthlyBudget / impressions) * 1000 : 0;
  return { vehiclesCount, totalKm, impressions, cpm };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAiCampaignEstimator() {
  const [inputs, setInputs] = useState<EstimatorInputs>({
    sector: null,
    city: null,
    monthlyBudget: 500,
  });
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReady = !!(inputs.sector && inputs.city);

  // Instant local update on every input change
  useEffect(() => {
    const local = computeLocal(inputs);
    if (!local) {
      setResult(null);
      return;
    }
    setResult((prev) => ({
      ...local,
      relevanceScore: prev?.relevanceScore ?? 72,
      insight: prev?.insight ?? "Calcul de la pertinence en cours…",
    }));
  }, [inputs]);

  // Debounced LLM call (600 ms after last change, only when all fields set)
  useEffect(() => {
    if (!isReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLlmLoading(true);
      try {
        const res = await estimateCampaign({
          data: {
            sector: inputs.sector!,
            city: inputs.city!,
            monthlyBudget: inputs.monthlyBudget,
          },
        });
        if (res.ok) {
          setResult((prev) =>
            prev
              ? { ...prev, relevanceScore: res.data.relevanceScore, insight: res.data.insight }
              : null,
          );
        }
      } finally {
        setLlmLoading(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputs, isReady]);

  const update = useCallback(
    <K extends keyof EstimatorInputs>(key: K, value: EstimatorInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { inputs, result, llmLoading, isReady, update };
}
