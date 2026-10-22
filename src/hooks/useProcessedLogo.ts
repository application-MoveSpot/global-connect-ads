import { useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

const EDGE_FN_URL = "https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/remove-logo-bg";
const cache = new Map<string, string>();

export function useProcessedLogo(logoUrl: string | null | undefined) {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setProcessedUrl(null);
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
        // Step 1: try server-side cache (edge function) — free if already cached, skip if unavailable
        const res = await Promise.race([
          fetch(EDGE_FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoUrl }),
            credentials: "omit",
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]);
        if (res.ok) {
          const data: { processedUrl?: string; cached?: boolean } = await res.json();
          if (data?.processedUrl) {
            if (!cancelled) {
              cache.set(logoUrl, data.processedUrl);
              setProcessedUrl(data.processedUrl);
            }
            return;
          }
        }
      } catch {
        // edge function unavailable or timed out — fall through
      }

      // Step 2: @imgly/background-removal — free, runs in browser via WebAssembly
      // publicPath loads ONNX models from CDN so they don't need to be bundled
      try {
        const blob = await removeBackground(logoUrl, {
          publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/",
        });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        cache.set(logoUrl, url);
        setProcessedUrl(url);
      } catch {
        // Step 3: silently show original logo — no error message shown to user
        if (!cancelled) setProcessedUrl(logoUrl);
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  return { processedUrl, isProcessing, error: null };
}
