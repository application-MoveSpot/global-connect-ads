import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ Onglet Briefs & Campagnes ============
export const adminListBriefsAndCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: briefs }, { data: campaigns }] = await Promise.all([
      supabaseAdmin
        .from("advertiser_briefs")
        .select(
          "id, title, description, zones, zone_area_km2, start_date, end_date, days_count, budget_max, status, creative_files, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("campaign_requests")
        .select(
          "id, spot_name, company, email, status, payment_status, total_price, start_date, end_date, days_count, zone_area_km2, creative_files, created_at, installation_photos, installation_status, installation_notes, installation_reviewed_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return { briefs: briefs ?? [], campaigns: campaigns ?? [] };
  });

export const adminApproveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        approve: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        owner_response: data.approve ? "approved" : "rejected",
        admin_notes: data.approve
          ? "✅ Visuel et zone de ciblage approuvés par MoveSpot — recherche de chauffeurs lancée."
          : "⛔ Visuel ou zone refusés par MoveSpot.",
      } as never)
      .eq("id", data.campaignRequestId)
      .select("spot_name, company, start_date, end_date")
      .single();
    if (error || !campaign) throw new Error(error?.message ?? "Campagne introuvable");

    if (data.approve) {
      // Notifie les poseurs certifiés qu'une nouvelle pose (avec son kit affiche/vidéo/QR) est
      // disponible dans leur espace. Best-effort : ne doit jamais faire échouer l'approbation.
      notifyCertifiedInstallers(campaign).catch((e) => console.error("notifyCertifiedInstallers failed", e));
    }

    return { ok: true };
  });

async function notifyCertifiedInstallers(campaign: {
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: installers } = await supabaseAdmin
    .from("payee_profiles")
    .select("user_id, full_name")
    .in("kind", ["installer", "both"])
    .eq("certification_status", "certified");
  if (!installers?.length) return;

  const { sendAppEmailSafe } = await import("@/lib/email/send.server");
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);

  await Promise.all(
    installers.map(async (installer) => {
      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(installer.user_id);
      const email = userRow?.user?.email;
      if (!email) return;
      await sendAppEmailSafe({
        templateName: "installation-job-available",
        recipientEmail: email,
        templateData: {
          fullName: installer.full_name,
          spotName: campaign.spot_name,
          company: campaign.company,
          startDate: fmtDate(campaign.start_date),
          endDate: fmtDate(campaign.end_date),
          spaceUrl: "https://move-spot.com/chauffeur/espace",
        },
      });
    }),
  );
}

export const adminApproveBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ briefId: z.string().uuid(), approve: z.boolean().default(true) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("advertiser_briefs")
      .update({ status: data.approve ? "open" : "cancelled" } as never)
      .eq("id", data.briefId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Onglet Certifications Poseurs ============
export const adminListPoseurs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payee_profiles")
      .select(
        "id, user_id, kind, full_name, phone, city, siret, siret_denomination, vehicle_kind, vehicle_plate, status, certification_status, certification_notes, stripe_payouts_enabled, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    return { poseurs: data ?? [] };
  });

export const adminCertifyPoseur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        payeeProfileId: z.string().uuid(),
        certified: z.boolean().default(true),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payee_profiles")
      .update({
        certification_status: data.certified ? "certified" : "rejected",
        certification_notes:
          data.notes ??
          (data.certified
            ? "🏅 Garage certifié manuellement par MoveSpot."
            : "⛔ Certification refusée par MoveSpot."),
        status: data.certified ? "approved" : "rejected",
      } as never)
      .eq("id", data.payeeProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Onglet Suivi Flotte ============
export const adminFleetLatestPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);

    const { data: campaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, spot_name, company, vehicle_id")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(200);

    const active = campaigns ?? [];
    if (active.length === 0) return { points: [] as FleetPoint[] };

    const { data: positions } = await supabaseAdmin
      .from("vehicle_positions")
      .select("campaign_request_id, vehicle_id, lat, lng, speed, heading, recorded_at")
      .in(
        "campaign_request_id",
        active.map((c) => c.id),
      )
      .order("recorded_at", { ascending: false })
      .limit(4000);

    const byVehicle = new Map<string, FleetPoint>();
    for (const p of positions ?? []) {
      if (byVehicle.has(p.vehicle_id)) continue;
      const camp = active.find((c) => c.id === p.campaign_request_id);
      byVehicle.set(p.vehicle_id, {
        vehicleId: p.vehicle_id,
        campaignId: p.campaign_request_id,
        campaignName: camp?.spot_name ?? null,
        company: camp?.company ?? null,
        lat: p.lat,
        lng: p.lng,
        speed: p.speed,
        recordedAt: p.recorded_at,
      });
    }

    return { points: Array.from(byVehicle.values()) };
  });

export type FleetPoint = {
  vehicleId: string;
  campaignId: string | null;
  campaignName: string | null;
  company: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  recordedAt: string;
};

// ============ Onglet Poses à valider ============
export const adminListInstallations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        "id, spot_name, company, email, start_date, end_date, status, payment_status, installation_photos, installation_status, installation_notes, installation_reviewed_at, created_at",
      )
      .not("installation_photos", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    return { installations: data ?? [] };
  });

export const adminReviewInstallation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        approve: z.boolean(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    if (!data.approve && !data.notes?.trim()) {
      throw new Error("Un motif de refus est obligatoire");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("campaign_requests")
      .update({
        installation_status: data.approve ? "approved" : "rejected",
        installation_notes: data.approve
          ? (data.notes ?? "✅ Pose conforme validée par MoveSpot.")
          : data.notes!,
        installation_reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.campaignRequestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
