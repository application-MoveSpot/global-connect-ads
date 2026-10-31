import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TranslationLang = "fr" | "en" | "ar";

interface TranslationEntry {
  text: string;
  detectedLang: string;
  cached: boolean;
}

interface UseMessageTranslationResult {
  // keyed by `${messageId}:${lang}` — multiple messages/langs managed at once
  translations: Record<string, TranslationEntry>;
  // set of keys currently in flight
  translating: Set<string>;
  translate: (messageId: string, messageText: string, lang: TranslationLang) => Promise<void>;
  hide: (messageId: string, lang: TranslationLang) => void;
}

// Maintains a two-layer cache:
//   1. In-memory (`cache` ref) — survives re-renders, avoids redundant server calls.
//   2. Server-side (`ai_translations` table) — the edge function reads+writes it.
// Failures are silent — never break the conversation UI for a translation error.
export function useMessageTranslation(): UseMessageTranslationResult {
  const [translations, setTranslations] = useState<Record<string, TranslationEntry>>({});
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const cache = useRef<Record<string, TranslationEntry>>({});

  const translate = useCallback(
    async (messageId: string, messageText: string, lang: TranslationLang) => {
      const key = `${messageId}:${lang}`;

      // 1. In-memory cache hit — no network call needed
      if (cache.current[key]) {
        setTranslations((prev) => ({ ...prev, [key]: cache.current[key] }));
        return;
      }

      setTranslating((prev) => new Set(prev).add(key));
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-translate-message",
          {
            body: {
              message_id: messageId,
              message_text: messageText,
              target_lang: lang,
            },
          },
        );
        if (fnError) throw fnError;

        const result = data as { translation: string; detected_lang: string; cached: boolean };
        const entry: TranslationEntry = {
          text: result.translation,
          detectedLang: result.detected_lang,
          cached: result.cached,
        };

        // 2. Populate in-memory cache for subsequent calls
        cache.current[key] = entry;
        setTranslations((prev) => ({ ...prev, [key]: entry }));
      } catch {
        // Silent fail — translation is non-critical
      } finally {
        setTranslating((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );

  const hide = useCallback((messageId: string, lang: TranslationLang) => {
    const key = `${messageId}:${lang}`;
    setTranslations((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // Keep in cache so showing it again is instant
  }, []);

  return { translations, translating, translate, hide };
}
