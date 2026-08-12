import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INSTALLATION_VIEWS = ["front", "left", "right", "rear"] as const;
export type InstallationView = (typeof INSTALLATION_VIEWS)[number];

export const INSTALLATION_VIEW_LABEL: Record<InstallationView, string> = {
  front: "Face avant",
  left: "Côté gauche",
  right: "Côté droit",
  rear: "Face arrière",
};

const photosSchema = z.object({
  front: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
  rear: z.string().min(1),
});

/** Le propriétaire du véhicule transmet les 4 vues après pose du covering. */
export const submitInstallationPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        photos: photosSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, vehicle_id")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (!campaign?.vehicle_id) throw new Error("Campagne ou véhicule introuvable");

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, owner_id")
      .eq("id", campaign.vehicle_id)
      .maybeSingle();
    if (!vehicle) throw new Error("Véhicule introuvable");

    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin && (!owner || owner.id !== vehicle.owner_id)) {
      throw new Error("Seul le propriétaire du véhicule peut transmettre la pose");
    }

    const { error } = await supabaseAdmin
      .from("campaign_requests")
      .update({
        installation_photos: {
          ...data.photos,
          submitted_at: new Date().toISOString(),
        },
        installation_status: "pending_approval",
        installation_notes: null,
        installation_reviewed_at: null,
      } as never)
      .eq("id", data.campaignRequestId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
