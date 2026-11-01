import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/shared/ConversationThread";

interface UseSmartRepliesOptions {
  briefId: string | null;
  proposalId: string | null;
  myRole: "advertiser" | "owner";
  messages: ChatMessage[];
  enabled?: boolean;
}

interface UseSmartRepliesResult {
  suggestions: string[];
  loading: boolean;
  dismiss: () => void;
}

// Auto-triggers after each message from the counterparty.
// Clears stale chips immediately on new message so UI stays responsive.
// Silent fail: smart replies are non-critical; errors never surface to the user.
export function useSmartReplies({
  briefId,
  proposalId,
  myRole,
  messages,
  enabled = true,
}: UseSmartRepliesOptions): UseSmartRepliesResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchedMsgId = useRef<string | undefined>(undefined);

  const fetchSuggestions = useCallback(
    async (lastMsgId: string) => {
      if (!briefId || !enabled) return;
      setLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("ai-smart-replies", {
          body: {
            brief_id: briefId,
            proposal_id: proposalId,
            my_role: myRole,
            last_message_id: lastMsgId,
          },
        });
        if (fnError) throw fnError;
        const result = data as { suggestions: string[] };
        setSuggestions(result.suggestions ?? []);
        lastFetchedMsgId.current = lastMsgId;
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [briefId, proposalId, myRole, enabled],
  );

  useEffect(() => {
    if (!enabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_role === myRole) return; // my own message — skip
    if (lastMsg.id === lastFetchedMsgId.current) return; // already fetched for this msg

    setSuggestions([]); // clear stale chips immediately
    void fetchSuggestions(lastMsg.id);
  }, [messages, myRole, enabled, fetchSuggestions]);

  // Clear when switching threads
  useEffect(() => {
    setSuggestions([]);
    lastFetchedMsgId.current = undefined;
  }, [briefId, proposalId]);

  const dismiss = useCallback(() => setSuggestions([]), []);

  return { suggestions, loading, dismiss };
}
