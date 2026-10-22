import { useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

const EDGE_FN_URL = "https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/remove-logo-bg";
const cache = new Map<string, string>();

const detouredCache = new Map<string, boolean>();

export function useProcessedLogo(logoUrl: string | null | undefined) {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetoured, setIsDetoured] = useState(false);

  useEffect(() => {
    setProcessedUrl(null);
    setIsProcessing(false);
    setIsDetoured(false);
    if (!logoUrl) return;

    const cached = cache.get(logoUrl);
    if (cached) {
      setProcessedUrl(cached);
      setIsDetoured(detouredCache.get(logoUrl) ?? false);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);

    (async () => {
      try {
        // Step 1: try server-side cache (edge function) — skip for blob: URLs (browser-only)
        if (logoUrl.startsWith("blob:")) throw new Error("blob URL");
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
              detouredCache.set(logoUrl, true);
              setProcessedUrl(data.processedUrl);
              setIsDetoured(true);
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
        detouredCache.set(logoUrl, true);
        setProcessedUrl(url);
        setIsDetoured(true);
      } catch {
        // Step 3: detourage failed — show original logo on top of vinyl backing
        // Do NOT hide vinyl layers: the logo still has its original background
        if (!cancelled) {
          cache.set(logoUrl, logoUrl);
          detouredCache.set(logoUrl, false);
          setProcessedUrl(logoUrl);
          setIsDetoured(false);
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  return { processedUrl, isProcessing, isDetoured, error: null };
}
