import { useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

const EDGE_FN_URL = "https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/remove-logo-bg";
const cache = new Map<string, string>();

export function useProcessedLogo(logoUrl: string | null | undefined) {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProcessedUrl(null);
    setError(null);
    setIsProcessing(false);
    if (!logoUrl) return;

    const cached = cache.get(logoUrl);
    if (cached) {
      setProcessedUrl(cached);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);

    (async () => {
      try {
        // Primary: Replicate via edge function (server-side, high quality)
        const res = await fetch(EDGE_FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl }),
          credentials: "omit",
        });
        if (res.ok) {
          const data: { processedUrl?: string } = await res.json();
          if (data?.processedUrl) {
            if (!cancelled) {
              cache.set(logoUrl, data.processedUrl);
              setProcessedUrl(data.processedUrl);
            }
            return;
          }
        }
        throw new Error("Replicate unavailable");
      } catch {
        // Fallback: @imgly/background-removal (client-side, free, no API)
        try {
          const blob = await removeBackground(logoUrl);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          cache.set(logoUrl, url);
          setProcessedUrl(url);
        } catch {
          if (!cancelled) {
            setProcessedUrl(logoUrl);
            setError("Détourage impossible, logo original affiché.");
          }
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  return { processedUrl, isProcessing, error };
}
