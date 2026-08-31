import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";

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

type InstallationPhotosJson = {
  front?: string;
  left?: string;
  right?: string;
  rear?: string;
  submitted_at?: string;
  claimed_by?: string;
  claimed_at?: string;
  lat?: number | null;
  lng?: number | null;
};

/** Poses à réaliser : campagnes approuvées dont la pose n'est pas encore validée,
 *  non réclamées par un autre poseur. */
export const listInstallationJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: payee } = await context.supabase
      .from("payee_profiles")
      .select("id, kind, certification_status")
      .eq("user_id", context.userId)
      .maybeSingle();

    const isInstaller =
      !!payee && (payee.kind === "installer" || payee.kind === "both") && payee.certification_status === "certified";
    if (!isInstaller) return { jobs: [], isInstaller: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        "id, spot_name, spot_location, company, start_date, end_date, installation_photos, installation_status, installation_notes, creative_files, total_price",
      )
      .eq("status", "approved")
      .neq("installation_status", "approved")
      .order("start_date", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    // Filter: show unclaimed jobs OR jobs claimed by this installer
    const jobs = (data ?? []).filter((job) => {
      const photos = job.installation_photos as InstallationPhotosJson | null;
      if (!photos?.claimed_by) return true;
      return photos.claimed_by === context.userId;
    });

    return { jobs, isInstaller: true as const };
  });

/** Missions terminées (pose validée) pour ce poseur. */
export const listCompletedInstallationJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: payee } = await context.supabase
      .from("payee_profiles")
      .select("kind, certification_status")
      .eq("user_id", context.userId)
      .maybeSingle();
    const isInstaller =
      !!payee && (payee.kind === "installer" || payee.kind === "both") && payee.certification_status === "certified";
    if (!isInstaller) return { jobs: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, spot_name, spot_location, company, start_date, end_date, installation_photos, total_price")
      .eq("status", "approved")
      .eq("installation_status", "approved")
      .order("start_date", { ascending: false })
      .limit(50);

    // Keep only the ones this installer submitted
    const jobs = (data ?? []).filter((job) => {
      const photos = job.installation_photos as InstallationPhotosJson | null;
      return photos?.claimed_by === context.userId;
    });

    return { jobs };
  });

/** Réclame une mission pour ce poseur. Empêche qu'un autre poseur la prenne. */
export const claimInstallationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignRequestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Only certified installers may claim jobs
    const { data: payee } = await context.supabase
      .from("payee_profiles")
      .select("kind, certification_status")
      .eq("user_id", context.userId)
      .maybeSingle();
    const isInstaller =
      !!payee && (payee.kind === "installer" || payee.kind === "both") && payee.certification_status === "certified";
    if (!isInstaller) throw new Error("Accès réservé aux poseurs certifiés.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, installation_photos, installation_status")
      .eq("id", data.campaignRequestId)
      .eq("status", "approved")
      .maybeSingle();
    if (!job) throw new Error("Mission introuvable.");

    const existing = job.installation_photos as InstallationPhotosJson | null;
    if (existing?.claimed_by && existing.claimed_by !== context.userId) {
      throw new Error("Cette mission a déjà été prise par un autre poseur.");
    }
    if (existing?.claimed_by === context.userId) return { ok: true }; // idempotent

    await supabaseAdmin
      .from("campaign_requests")
      .update({
        installation_photos: {
          claimed_by: context.userId,
          claimed_at: new Date().toISOString(),
        } as never,
      })
      .eq("id", data.campaignRequestId);

    return { ok: true };
  });

/** Libère une mission (si pas encore soumise). */
export const unclaimInstallationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignRequestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, installation_photos, installation_status")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (!job) throw new Error("Mission introuvable.");

    const existing = job.installation_photos as InstallationPhotosJson | null;
    if (existing?.claimed_by !== context.userId) throw new Error("Mission non réclamée par vous.");
    // Can only unclaim if photos not yet submitted
    if (existing?.front || existing?.left) throw new Error("Impossible de libérer une mission dont les photos ont été soumises.");

    await supabaseAdmin
      .from("campaign_requests")
      .update({ installation_photos: null as never })
      .eq("id", data.campaignRequestId);

    return { ok: true };
  });

/** Retourne les photos de pose d'une campagne pour l'annonceur propriétaire. */
export const getInstallationPhotosForAdvertiser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ campaignId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, spot_name, installation_photos, installation_status, installation_notes, installation_reviewed_at")
      .eq("id", data.campaignId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error || !campaign) throw new Error("Campagne introuvable ou accès non autorisé");

    return {
      spotName: campaign.spot_name as string,
      photos: campaign.installation_photos as Record<string, string> | null,
      status: campaign.installation_status as string | null,
      notes: campaign.installation_notes as string | null,
      reviewedAt: campaign.installation_reviewed_at as string | null,
    };
  });

/** Seul un poseur certifié MoveSpot (ou un admin) transmet les 4 vues après pose. */
export const submitInstallationPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        photos: photosSchema,
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertRateLimit(`install-photos:${getRequestIp()}`, { maxRequests: 20, windowMs: 3_600_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, vehicle_id, installation_photos")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (!campaign?.vehicle_id) throw new Error("Campagne ou véhicule introuvable");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const { data: payee } = await context.supabase
      .from("payee_profiles")
      .select("kind, certification_status")
      .eq("user_id", context.userId)
      .maybeSingle();
    const isCertifiedInstaller =
      !!payee && (payee.kind === "installer" || payee.kind === "both") && payee.certification_status === "certified";

    if (!isAdmin && !isCertifiedInstaller) {
      throw new Error(
        "Seul un poseur professionnel certifié MoveSpot peut transmettre les photos de pose.",
      );
    }

    // Preserve claimed_by from existing JSONB
    const existing = campaign.installation_photos as InstallationPhotosJson | null;

    const { error } = await supabaseAdmin
      .from("campaign_requests")
      .update({
        installation_photos: {
          claimed_by: existing?.claimed_by ?? context.userId,
          claimed_at: existing?.claimed_at ?? new Date().toISOString(),
          ...data.photos,
          submitted_at: new Date().toISOString(),
          lat: data.lat ?? null,
          lng: data.lng ?? null,
        } as never,
        installation_status: "pending_approval",
        installation_notes: null,
        installation_reviewed_at: null,
      } as never)
      .eq("id", data.campaignRequestId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
