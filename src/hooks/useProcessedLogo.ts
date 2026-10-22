import { useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

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
      // @imgly/background-removal — free, runs in browser via WebAssembly
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
        // Detourage failed — show original logo on top of vinyl backing with mix-blend-mode: multiply
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
