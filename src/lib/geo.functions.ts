import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vérifie côté base (PostGIS) si une position GPS est à l'intérieur
 * du polygone de ciblage d'une campagne.
 * Retourne null si la campagne n'a pas de zone définie.
 */
export const checkPointInCampaignZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inside, error } = await supabaseAdmin.rpc("is_point_in_campaign_zone", {
      p_campaign_id: data.campaignRequestId,
      p_lat: data.lat,
      p_lng: data.lng,
    });
    if (error) throw new Error(error.message);
    return { inside: inside as boolean | null };
  });
