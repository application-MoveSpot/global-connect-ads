import { useEffect, useState } from "react";
import { getVehiclePhotoSignedUrls } from "@/lib/fleet/vehicle-photos.functions";

export function useVehiclePhotoUrls(photosOrPaths: string[] | null | undefined): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const input = photosOrPaths ?? [];
    if (input.length === 0) {
      setUrls([]);
      return;
    }

    let cancelled = false;
    getVehiclePhotoSignedUrls({ data: input }).then((resolved) => {
      if (!cancelled) setUrls(resolved);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(photosOrPaths)]);

  return urls;
}
