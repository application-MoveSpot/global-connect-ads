import { useState, useEffect, useRef } from "react";
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
          const response = await fetch(logoUrl, { signal: controller.signal });
          const blob = await response.blob();
          image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image invalide"));
            reader.onerror = () => reject(new Error("Image illisible"));
            reader.readAsDataURL(blob);
          });
        }
        if (controller.signal.aborted) return;
        const { data, error: processingError } = await supabase.functions.invoke("remove-logo-bg", { body: { logoUrl: image } });
        if (controller.signal.aborted) return;
        if (processingError || !data?.processedUrl) throw new Error("Le détourage du logo a échoué. Réessayez avec une autre image.");
        cache.set(logoUrl, data.processedUrl);
        setProcessedUrl(data.processedUrl);
      } catch {
        if (!controller.signal.aborted) setError("Le détourage du logo a échoué. Réessayez avec une autre image.");
      } finally {
        if (!controller.signal.aborted) setIsProcessing(false);
      }
    };
    void process();
    return () => controller.abort();
  }, [logoUrl]);

  return { processedUrl, isProcessing, error };
}
