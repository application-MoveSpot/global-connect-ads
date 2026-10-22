import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useProcessedLogo(logoUrl: string | null | undefined) {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setProcessedUrl(null);
    setError(null);
    setIsProcessing(false);
    if (!logoUrl) return;
    const cached = cache.get(logoUrl);
    if (cached) { setProcessedUrl(cached); return; }
    setIsProcessing(true);
    const process = async () => {
      try {
        let image = logoUrl;
        // A blob URL only exists in this browser, so rembg cannot fetch it.
        if (logoUrl.startsWith("blob:")) {
          const bitmap = new Image();
          bitmap.src = logoUrl;
          await bitmap.decode();
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.naturalWidth;
          canvas.height = bitmap.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let transparent = false;
            for (let i = 3; i < pixels.length; i += 4) {
              if ((pixels[i] ?? 255) < 250) { transparent = true; break; }
            }
            if (transparent) {
              if (!controller.signal.aborted) { cache.set(logoUrl, logoUrl); setProcessedUrl(logoUrl); }
              return;
            }
            image = canvas.toDataURL("image/png");
          } else throw new Error("Image illisible");
        }
        if (controller.signal.aborted) return;
        const { data, error: processingError } = await supabase.functions.invoke("remove-logo-bg", { body: { logoUrl: image } });
        if (controller.signal.aborted) return;
        if (processingError || !data?.processedUrl) throw new Error("Le détourage du logo a échoué. Réessayez avec une autre image.");
        cache.set(logoUrl, data.processedUrl);
        setProcessedUrl(data.processedUrl);
      } catch {
        if (!controller.signal.aborted) {
          setProcessedUrl(logoUrl);
          setError("Le détourage du logo a échoué. Le logo original est affiché.");
        }
      } finally {
        if (!controller.signal.aborted) setIsProcessing(false);
      }
    };
    void process();
    return () => controller.abort();
  }, [logoUrl]);

  return { processedUrl, isProcessing, error };
}
