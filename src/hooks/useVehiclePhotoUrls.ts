import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves vehicle photo entries to displayable URLs.
 * Accepts either full https:// CDN URLs (returned as-is) or storage paths
 * (userId/filename) — resolved via getPublicUrl since the bucket is public.
 */
export function useVehiclePhotoUrls(photosOrPaths: string[] | null | undefined): string[] {
  return (photosOrPaths ?? []).map((p) => {
    if (p.startsWith("http")) return p;
    const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(p);
    return data.publicUrl;
  });
}
