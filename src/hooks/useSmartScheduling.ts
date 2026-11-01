import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SchedulingTier = "optimal" | "good" | "average" | "avoid";

export interface WeekRecommendation {
  week_start: string;
  score: number;
  tier: SchedulingTier;
  rationale: string;
  predicted_reach_multiplier: number;
}

export interface SmartSchedulingResult {
  recommendations: WeekRecommendation[];
  best_window: { start: string; end: string; reason: string } | null;
  warnings: string[];
}

// Tailwind classes for calendar slot coloring by tier
export const TIER_COLORS: Record<SchedulingTier, string> = {
  optimal: "bg-green-100 border-green-400 text-green-800",
  good:    "bg-blue-100 border-blue-400 text-blue-800",
  average: "bg-amber-100 border-amber-400 text-amber-800",
  avoid:   "bg-red-100 border-red-400 text-red-700",
};

export const TIER_LABELS: Record<SchedulingTier, string> = {
  optimal: "Optimal",
  good:    "Favorable",
  average: "Acceptable",
  avoid:   "Déconseillé",
};

interface CampaignHistoryEntry {
  start_date: string;
  end_date: string;
  budget: number;
  impressions: number;
  clicks: number;
  sector: string;
}

interface UseSmartSchedulingOptions {
  sector: string;
  budgetHint?: number;
}

export function useSmartScheduling({ sector, budgetHint }: UseSmartSchedulingOptions) {
  const [result, setResult] = useState<SmartSchedulingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (
      rangeStart: Date,
      rangeEnd: Date,
      campaignHistory: CampaignHistoryEntry[] = [],
    ) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-smart-scheduling",
          {
            body: {
              range_start: rangeStart.toISOString().slice(0, 10),
              range_end: rangeEnd.toISOString().slice(0, 10),
              sector,
              campaign_history: campaignHistory,
              budget_hint: budgetHint,
            },
          },
        );
        if (fnError) throw fnError;
        setResult(data as SmartSchedulingResult);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur Smart Scheduling");
      } finally {
        setLoading(false);
      }
    },
    [sector, budgetHint],
  );

  // Returns the Tailwind class string for a given ISO date (week slot lookup)
  const getSlotStyle = useCallback(
    (dateStr: string): string => {
      if (!result) return "";
      const rec = result.recommendations.find((r) => r.week_start === dateStr);
      return rec ? TIER_COLORS[rec.tier] : "";
    },
    [result],
  );

  // Returns the recommendation for a given ISO date string, or null
  const getSlotData = useCallback(
    (dateStr: string): WeekRecommendation | null => {
      if (!result) return null;
      return result.recommendations.find((r) => r.week_start === dateStr) ?? null;
    },
    [result],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, analyze, getSlotStyle, getSlotData, reset };
}
