import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVehiclePhotoUrls(photosOrPaths: string[] | null | undefined): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const input = photosOrPaths ?? [];
    if (input.length === 0) {
      setUrls([]);
      return;
    }

    let cancelled = false;
    const resolve = async () => {
      const resolved = await Promise.all(
        input.map(async (p) => {
          let path = p;
          if (p.includes("/storage/v1/object/public/vehicle-photos/")) {
            path = p.split("/storage/v1/object/public/vehicle-photos/")[1];
          } else if (p.startsWith("http")) {
            return p;
          }
          const { data } = await supabase.storage
            .from("vehicle-photos")
            .createSignedUrl(path, 7200);
          return data?.signedUrl ?? "";
        }),
      );
      if (!cancelled) setUrls(resolved.filter(Boolean));
    };
    void resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(photosOrPaths)]);

  return urls;
}
