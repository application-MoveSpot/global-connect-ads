import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SupportedLang = "fr" | "en" | "ar";

interface TranslationResult {
  translation: string;
  detected_lang: string;
  cached: boolean;
}

interface UseMessageTranslationResult {
  translation: string | null;
  detectedLang: string | null;
  loading: boolean;
  error: string | null;
  translate: (opts: {
    messageId?: string;
    messageText: string;
    targetLang: SupportedLang;
  }) => Promise<void>;
  reset: () => void;
}

export function useMessageTranslation(): UseMessageTranslationResult {
  const [translation, setTranslation] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async ({
      messageId,
      messageText,
      targetLang,
    }: {
      messageId?: string;
      messageText: string;
      targetLang: SupportedLang;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-translate-message",
          {
            body: {
              message_id: messageId,
              message_text: messageText,
              target_lang: targetLang,
            },
          },
        );
        if (fnError) throw fnError;
        const result = data as TranslationResult;
        setTranslation(result.translation);
        setDetectedLang(result.detected_lang);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la traduction");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setTranslation(null);
    setDetectedLang(null);
    setError(null);
  }, []);

  return { translation, detectedLang, loading, error, translate, reset };
}
