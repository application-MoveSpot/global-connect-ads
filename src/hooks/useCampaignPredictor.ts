import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Recommendation = "GO" | "ADJUST" | "NO-GO";

export interface DailyBreakdown {
  day: string;
  impressions_ratio: number;
}

export interface CampaignPrediction {
  impressions_estimate: { low: number; mid: number; high: number };
  cpm_estimate: number;
  engagement_rate: number;
  roi_score: number;
  confidence: number;
  daily_breakdown: DailyBreakdown[];
  key_factors: string[];
  risk_flags: string[];
  recommendation: Recommendation;
  recommendation_reason: string;
}

export const RECOMMENDATION_STYLES: Record<
  Recommendation,
  { label: string; className: string; badgeClass: string }
> = {
  "GO":     { label: "Lancer",       className: "border-green-400 bg-green-50", badgeClass: "bg-green-100 text-green-800" },
  "ADJUST": { label: "À ajuster",    className: "border-amber-400 bg-amber-50", badgeClass: "bg-amber-100 text-amber-800" },
  "NO-GO":  { label: "Déconseillé", className: "border-red-400 bg-red-50",     badgeClass: "bg-red-100 text-red-800" },
};

interface PredictorOptions {
  startDate: Date;
  durationDays: number;
  budget: number;
  sector: string;
  city: string;
  vehicleCountEstimate?: number;
  zoneType?: "urban_center" | "suburban" | "highway" | "mixed";
  competitorPressure?: "low" | "medium" | "high";
  pastCampaignsAvgCpm?: number;
}

export function useCampaignPredictor() {
  const [prediction, setPrediction] = useState<CampaignPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (opts: PredictorOptions) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-campaign-predictor",
        {
          body: {
            start_date: opts.startDate.toISOString().slice(0, 10),
            duration_days: opts.durationDays,
            budget: opts.budget,
            sector: opts.sector,
            city: opts.city,
            vehicle_count_estimate: opts.vehicleCountEstimate,
            zone_type: opts.zoneType,
            competitor_pressure: opts.competitorPressure,
            past_campaigns_avg_cpm: opts.pastCampaignsAvgCpm,
          },
        },
      );
      if (fnError) throw fnError;
      setPrediction(data as CampaignPrediction);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur prédiction");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPrediction(null);
    setError(null);
  }, []);

  return { prediction, loading, error, predict, reset };
}
