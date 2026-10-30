import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PackRecommendationId =
  | "starter"
  | "standard"
  | "boost"
  | "weekend"
  | "evenement"
  | "lancement";

export type PackRecommendation = {
  recommendedId: PackRecommendationId | null;
  tagline: string;
  loading: boolean;
};

function computeRecommendation(brief: {
  budget_max?: number | null;
  zones?: string | null;
} | null): { id: PackRecommendationId; tagline: string } {
  if (!brief) {
    return { id: "standard", tagline: "Notre pack le plus populaire pour démarrer." };
  }

  const budget = brief.budget_max ?? 0;
  const zones = brief.zones
    ? brief.zones
        .split(",")
        .map((z) => z.trim())
        .filter(Boolean)
    : [];

  if (zones.length > 1 || budget > 100) {
    const zoneNote =
      zones.length > 1 ? `vos ${zones.length} zones ciblées` : "votre budget ambitieux";
    return {
      id: "boost",
      tagline: `Pour ${zoneNote}, le Boost maximise votre visibilité sur 30 jours.`,
    };
  }
  if (budget > 49) {
    return {
      id: "standard",
      tagline: "Le meilleur équilibre durée / prix pour votre projet.",
    };
  }
  return {
    id: "starter",
    tagline: "Parfait pour tester votre campagne en conditions réelles.",
  };
}

export function usePackRecommendation(): PackRecommendation {
  const [state, setState] = useState<PackRecommendation>({
    recommendedId: null,
    tagline: "",
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setState({ recommendedId: null, tagline: "", loading: false });
          return;
        }

        const { data: brief } = await supabase
          .from("advertiser_briefs")
          .select("budget_max, zones")
          .eq("advertiser_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        const { id, tagline } = computeRecommendation(
          brief as { budget_max?: number | null; zones?: string | null } | null,
        );
        setState({ recommendedId: id, tagline, loading: false });
      } catch {
        if (!cancelled) setState({ recommendedId: null, tagline: "", loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
