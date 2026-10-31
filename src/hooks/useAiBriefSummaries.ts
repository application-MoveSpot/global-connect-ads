import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BriefSummary = {
  brief_id: string;
  summary_text: string;
  action_required: boolean;
  generated_at: string;
};

/**
 * Fetches or generates AI summaries for a list of brief IDs.
 * Uses `ai_brief_summaries` table as a cache (TTL 24h).
 * Falls back silently — if the Edge Function fails, the badge simply doesn't render.
 */
export function useAiBriefSummaries(briefIds: string[]) {
  const [summaries, setSummaries] = useState<Record<string, BriefSummary>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (briefIds.length === 0) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        // 1. Check cache in ai_brief_summaries
        const { data: cached } = await supabase
          .from("ai_brief_summaries")
          .select("brief_id, summary_text, action_required, generated_at, expires_at")
          .in("brief_id", briefIds);

        const now = new Date().toISOString();
        const validCache: Record<string, BriefSummary> = {};
        const staleIds = new Set(briefIds);

        for (const row of cached ?? []) {
          if (row.expires_at > now) {
            validCache[row.brief_id] = row as BriefSummary;
            staleIds.delete(row.brief_id);
          }
        }

        if (!cancelled) setSummaries(validCache);

        // 2. Generate for stale/missing briefs (batched, max 5 concurrent)
        const toFetch = Array.from(staleIds);
        for (let i = 0; i < toFetch.length; i += 5) {
          if (cancelled) break;
          const batch = toFetch.slice(i, i + 5);
          await Promise.all(
            batch.map(async (briefId) => {
              try {
                const { data, error } = await supabase.functions.invoke("ai-brief-smart-summary", {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                  body: { brief_id: briefId },
                });
                if (!error && data && !cancelled) {
                  const summary = data as BriefSummary;
                  setSummaries((prev) => ({ ...prev, [briefId]: summary }));
                }
              } catch {
                /* fail silently per brief */
              }
            }),
          );
        }
      } catch {
        /* fail silently */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [briefIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { summaries, loading };
}
