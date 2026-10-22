import { useState, useEffect, useRef } from "react";

const cache = new Map<string, string>();

const EDGE_FN_URL =
  "https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/remove-logo-bg";

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

    fetch(EDGE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data?.processedUrl) {
          cache.set(logoUrl, data.processedUrl);
          setProcessedUrl(data.processedUrl);
        } else {
          setProcessedUrl(logoUrl);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setProcessedUrl(logoUrl);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsProcessing(false);
      });

    return () => controller.abort();
  }, [logoUrl]);

  return { processedUrl, isProcessing };
}
