import { useState, useEffect } from "react";
import { computeFeasibilityScore } from "@/lib/ai/feasibility-score.functions";
import type { FeasibilityBreakdown } from "@/lib/ai/feasibility-score.functions";

type AiBriefSnippet = {
  answers: Record<string, string>;
};

type Params = {
  aiBrief: AiBriefSnippet | null;
  serviceType: string;
  vehicleType: string | null | undefined;
  providerServices: string[] | null;
  providerDescription: string | null | undefined;
};

export function useQuoteFeasibility({
  aiBrief,
  serviceType,
  vehicleType,
  providerServices,
  providerDescription,
}: Params): { feasibility: FeasibilityBreakdown | null; feasLoading: boolean } {
  const [feasibility, setFeasibility] = useState<FeasibilityBreakdown | null>(null);
  const [feasLoading, setFeasLoading] = useState(false);

  useEffect(() => {
    if (!aiBrief) return;
    let cancelled = false;
    setFeasLoading(true);
    computeFeasibilityScore({
      data: {
        serviceType,
        vehicleType: vehicleType ?? undefined,
        answers: aiBrief.answers,
        providerServices: providerServices ?? [],
        providerDescription: providerDescription ?? undefined,
      },
    })
      .then((res) => {
        if (!cancelled && res.ok) setFeasibility(res.data);
      })
      .finally(() => {
        if (!cancelled) setFeasLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiBrief, serviceType, vehicleType, providerServices, providerDescription]);

  return { feasibility, feasLoading };
}
