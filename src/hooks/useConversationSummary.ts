import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConversationSummary {
  conversation_id: string;
  summary: string;
  status: "negotiating" | "agreed" | "stalled" | "closed";
  action_required: boolean;
  generated_at: string;
  cached: boolean;
}

interface UseConversationSummaryResult {
  summary: ConversationSummary | null;
  loading: boolean;
  error: string | null;
  fetch: (conversationId: string) => Promise<void>;
  reset: () => void;
}

export function useConversationSummary(): UseConversationSummaryResult {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-conversation-summary",
        { body: { conversation_id: conversationId } },
      );
      if (fnError) throw fnError;
      setSummary(data as ConversationSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du résumé");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { summary, loading, error, fetch, reset };
}
