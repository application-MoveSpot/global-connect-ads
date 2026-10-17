import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server function that generates signed URLs for vehicle photos using the
 * service role — bypasses RLS so it works for public visitors, advertisers,
 * and any authenticated user without direct Storage access.
 */
export const getVehiclePhotoSignedUrls = createServerFn({ method: "POST" })
  .validator(z.array(z.string()))
  .handler(async ({ data: paths }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urls = await Promise.all(
      paths.map(async (p: string) => {
        let path = p;
        if (p.includes("/storage/v1/object/public/vehicle-photos/")) {
          path = p.split("/storage/v1/object/public/vehicle-photos/")[1];
        } else if (p.includes("/storage/v1/object/sign/vehicle-photos/")) {
          // Expired signed URL stored in DB — extract the path and re-sign it.
          const match = p.match(/\/storage\/v1\/object\/sign\/vehicle-photos\/([^?]+)/);
          path = match ? decodeURIComponent(match[1]) : p;
        } else if (p.startsWith("http")) {
          return p;
        }
        const { data } = await supabaseAdmin.storage
          .from("vehicle-photos")
          .createSignedUrl(path, 7200);
        return data?.signedUrl ?? "";
      }),
    );
    return urls.filter(Boolean);
  });
