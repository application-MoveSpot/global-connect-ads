import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useProcessedLogo(logoUrl: string | null | undefined) {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!logoUrl) {
      setProcessedUrl(null);
      return;
    }

    if (cache.has(logoUrl)) {
      setProcessedUrl(cache.get(logoUrl)!);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsProcessing(true);
    setProcessedUrl(null);

    supabase.functions
      .invoke("remove-logo-bg", { body: { logoUrl } })
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error || !data?.processedUrl) {
          // Fallback: use original logo
          setProcessedUrl(logoUrl);
        } else {
          cache.set(logoUrl, data.processedUrl);
          setProcessedUrl(data.processedUrl);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsProcessing(false);
      });

    return () => controller.abort();
  }, [logoUrl]);

  return { processedUrl, isProcessing };
}
