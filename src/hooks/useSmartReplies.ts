import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSmartRepliesOptions {
  conversationId: string;
  lastMessageId?: string;
  lastMessageSenderId?: string;
  currentUserId?: string;
  enabled?: boolean;
}

interface UseSmartRepliesResult {
  suggestions: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismiss: () => void;
}

export function useSmartReplies({
  conversationId,
  lastMessageId,
  lastMessageSenderId,
  currentUserId,
  enabled = true,
}: UseSmartRepliesOptions): UseSmartRepliesResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedMessageId = useRef<string | undefined>(undefined);

  const fetchSuggestions = useCallback(async () => {
    if (!conversationId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-smart-replies", {
        body: { conversation_id: conversationId, last_message_id: lastMessageId },
      });
      if (fnError) throw fnError;
      const result = data as { suggestions: string[] };
      setSuggestions(result.suggestions ?? []);
      lastFetchedMessageId.current = lastMessageId;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors des suggestions");
    } finally {
      setLoading(false);
    }
  }, [conversationId, lastMessageId, enabled]);

  // Auto-trigger when a new message arrives from the other party
  useEffect(() => {
    if (
      !enabled ||
      !lastMessageId ||
      !lastMessageSenderId ||
      !currentUserId ||
      lastMessageSenderId === currentUserId ||
      lastMessageId === lastFetchedMessageId.current
    ) {
      return;
    }
    fetchSuggestions();
  }, [lastMessageId, lastMessageSenderId, currentUserId, enabled, fetchSuggestions]);

  const dismiss = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, error, refresh: fetchSuggestions, dismiss };
}
