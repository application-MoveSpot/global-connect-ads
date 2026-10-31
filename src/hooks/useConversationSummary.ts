import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NegotiationStatus = "negotiating" | "agreed" | "stalled" | "closed";

export interface ConversationSummary {
  summary: string;
  status: NegotiationStatus;
  action_required: boolean;
  generated_at: string;
  cached: boolean;
}

interface UseConversationSummaryResult {
  summary: ConversationSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reset: () => void;
}

// Auto-fetches when messageCount reaches 3 and every 5 new messages thereafter.
// Manual refresh is always available via the returned `refresh` function.
export function useConversationSummary(
  briefId: string | null,
  proposalId: string | null,
  messageCount: number = 0,
): UseConversationSummaryResult {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(-1);

  const fetchSummary = useCallback(async () => {
    if (!briefId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-conversation-summary",
        { body: { brief_id: briefId, proposal_id: proposalId } },
      );
      if (fnError) throw fnError;
      setSummary(data as ConversationSummary);
      lastFetchedAt.current = messageCount;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du résumé");
    } finally {
      setLoading(false);
    }
  }, [briefId, proposalId, messageCount]);

  // Auto-trigger: first fetch at 3 messages, then every 5 new messages.
  useEffect(() => {
    if (messageCount < 3) return;
    const isFirstFetch = lastFetchedAt.current === -1;
    const newMessagesBatch = messageCount - lastFetchedAt.current >= 5;
    if (isFirstFetch || newMessagesBatch) {
      void fetchSummary();
    }
  }, [messageCount, fetchSummary]);

  // Reset state when switching threads.
  useEffect(() => {
    setSummary(null);
    setError(null);
    lastFetchedAt.current = -1;
  }, [briefId, proposalId]);

  const reset = useCallback(() => {
    setSummary(null);
    setError(null);
    lastFetchedAt.current = -1;
  }, []);

  return { summary, loading, error, refresh: fetchSummary, reset };
}
