import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves vehicle photo entries to displayable URLs.
 * Accepts either legacy public http:// URLs (stored before bucket went private)
 * or storage paths (userId/filename) — the latter get signed URL generation.
 */
export function useVehiclePhotoUrls(photosOrPaths: string[] | null | undefined): string[] {
  const input = photosOrPaths ?? [];
  const [urls, setUrls] = useState<string[]>(() =>
    input.map((p) => (p.startsWith("http") ? p : "")),
  );

  useEffect(() => {
    const paths = input.filter((p) => !p.startsWith("http"));
    if (paths.length === 0) {
      setUrls(input.map((p) => (p.startsWith("http") ? p : "")));
      return;
    }

    supabase.storage
      .from("vehicle-photos")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!data) return;
        let sigIdx = 0;
        setUrls(
          input.map((p) => {
            if (p.startsWith("http")) return p;
            return data[sigIdx++]?.signedUrl ?? "";
          }),
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.join(",")]);

  return urls;
}
