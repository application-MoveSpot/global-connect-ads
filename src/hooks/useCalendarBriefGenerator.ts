import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Tagline {
  text: string;
  tone: "direct" | "emotionnel" | "humoristique";
}

export interface GeneratedBrief {
  title: string;
  objective: string;
  target_audience: string;
  vehicle_types: string[];
  taglines: Tagline[];
  recommended_duration_days: number;
  budget_range: { min: number; max: number };
}

interface BriefGeneratorOptions {
  campaignDate: Date;
  sector: string;
  city?: string;
  vehiclePreference?: string[];
  budgetHint?: number;
  extraContext?: string;
}

export function useCalendarBriefGenerator() {
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (opts: BriefGeneratorOptions) => {
    setLoading(true);
    setError(null);
    setBrief(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-calendar-brief", {
        body: {
          campaign_date: opts.campaignDate.toISOString().slice(0, 10),
          sector: opts.sector,
          city: opts.city,
          vehicle_preference: opts.vehiclePreference,
          budget_hint: opts.budgetHint,
          extra_context: opts.extraContext,
        },
      });
      if (fnError) throw fnError;
      setBrief(data as GeneratedBrief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur génération brief");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-fills a react-hook-form instance with the generated brief.
  // taglineIndex selects which of the 3 taglines to apply (0–2).
  const applyToForm = useCallback(
    (setValue: (field: string, value: unknown) => void, taglineIndex = 0) => {
      if (!brief) return;
      setValue("title", brief.title);
      setValue("objective", brief.objective);
      setValue("target_audience", brief.target_audience);
      setValue("vehicle_types", brief.vehicle_types);
      setValue("tagline", brief.taglines[taglineIndex]?.text ?? "");
      setValue("duration_days", brief.recommended_duration_days);
      setValue("budget_min", brief.budget_range.min);
      setValue("budget_max", brief.budget_range.max);
    },
    [brief],
  );

  const reset = useCallback(() => {
    setBrief(null);
    setError(null);
  }, []);

  return { brief, loading, error, generate, applyToForm, reset };
}
