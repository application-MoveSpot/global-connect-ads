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
    const adminNotes = data.approve
      ? "✅ Visuel et zone de ciblage approuvés par MoveSpot — recherche de chauffeurs lancée."
      : (data.notes?.trim() || "⛔ Visuel ou zone refusés par MoveSpot.");

    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        owner_response: data.approve ? "approved" : "rejected",
        admin_notes: adminNotes,
      } as never)
      .eq("id", data.campaignRequestId)
      .select("spot_name, company, email, start_date, end_date, total_price, user_id")
      .single();
    if (error || !campaign) throw new Error(error?.message ?? "Campagne introuvable");

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");

    if (data.approve) {
      // Email annonceur — campagne approuvée
      if (campaign.email) {
        sendAppEmailSafe({
          templateName: "campaign-approved",
          recipientEmail: campaign.email,
          templateData: {
            company: campaign.company,
            spotName: campaign.spot_name,
            startDate: fmtDate(campaign.start_date),
            endDate: fmtDate(campaign.end_date),
            totalPrice: campaign.total_price != null
              ? Number(campaign.total_price).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
              : undefined,
            paymentUrl: "https://move-spot.com/annonceur",
          },
        }).catch((e) => console.error("campaign-approved email failed", e));
      }
      // Push annonceur — campagne approuvée
      if (campaign.user_id) {
        sendWebPushToUser(campaign.user_id as string, {
          title: "Campagne approuvée ! 🎉",
          body: campaign.spot_name
            ? `${campaign.spot_name} est validée — procédez au paiement pour la lancer.`
            : "Votre campagne est validée — procédez au paiement.",
          url: "/advertiser",
        }).catch(() => {});
      }
      // Notifie les poseurs certifiés
      notifyCertifiedInstallers(campaign).catch((e) => console.error("notifyCertifiedInstallers failed", e));
      // Notifie les prestataires actifs (covering, vidéo, graphisme)
      notifyActiveProviders(campaign).catch((e) => console.error("notifyActiveProviders failed", e));
    } else {
      // Email annonceur — campagne refusée
      if (campaign.email) {
        sendAppEmailSafe({
          templateName: "campaign-rejected",
          recipientEmail: campaign.email,
          templateData: {
            company: campaign.company,
            spotName: campaign.spot_name,
            reason: adminNotes,
            newCampaignUrl: "https://move-spot.com/",
          },
        }).catch((e) => console.error("campaign-rejected email failed", e));
      }
      // Push annonceur — campagne refusée
      if (campaign.user_id) {
        sendWebPushToUser(campaign.user_id as string, {
          title: "Campagne non approuvée",
          body: "Consultez les notes de l'équipe MoveSpot pour corriger votre demande.",
          url: "/advertiser",
        }).catch(() => {});
      }
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

async function notifyActiveProviders(campaign: {
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: providers } = await supabaseAdmin
    .from("provider_profiles")
    .select("user_id, full_name")
    .eq("stripe_subscription_status" as never, "active");
  if (!providers?.length) return;

  const { sendAppEmailSafe } = await import("@/lib/email/send.server");
  const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);

  await Promise.allSettled(
    (providers as Array<{ user_id: string; full_name: string | null }>).map(async (provider) => {
      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(provider.user_id);
      const email = userRow?.user?.email;
      await Promise.allSettled([
        email
          ? sendAppEmailSafe({
              templateName: "campaign-opportunity",
              recipientEmail: email,
              templateData: {
                fullName: provider.full_name ?? undefined,
                spotName: campaign.spot_name,
                company: campaign.company,
                startDate: fmtDate(campaign.start_date),
                endDate: fmtDate(campaign.end_date),
                profileUrl: "https://move-spot.com/prestataire",
              },
            })
          : Promise.resolve(),
        sendWebPushToUser(provider.user_id, {
          title: "🎯 Nouvelle opportunité de prestation",
          body: campaign.spot_name
            ? `La campagne « ${campaign.spot_name} » peut nécessiter vos services.`
            : "Une nouvelle campagne est disponible sur MoveSpot.",
          url: "/provider",
        }),
      ]);
    }),
  );
}

export const adminApproveBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ briefId: z.string().uuid(), approve: z.boolean().default(true), notes: z.string().max(500).optional() })
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

export const adminSendStripeReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ payeeProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payee } = await supabaseAdmin
      .from("payee_profiles")
      .select("user_id, full_name")
      .eq("id", data.payeeProfileId)
      .single();
    if (!payee) throw new Error("Prestataire introuvable");

    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(payee.user_id);
    const email = userRow?.user?.email;
    if (!email) throw new Error("Email introuvable pour ce prestataire");

    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    await sendAppEmailSafe({
      templateName: "stripe-reminder",
      recipientEmail: email,
      idempotencyKey: `stripe-reminder-${data.payeeProfileId}-${new Date().toISOString().slice(0, 10)}`,
      templateData: {
        fullName: payee.full_name,
        spaceUrl: "https://move-spot.com/chauffeur/espace",
      },
    });

    return { ok: true };
  });

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
        "id, spot_name, company, email, start_date, end_date, status, payment_status, installation_photos, installation_status, installation_notes, installation_reviewed_at, pose_fee_cents, pose_payout_status, pose_stripe_transfer_id, pose_installer_user_id, created_at",
      )
      .not("installation_photos", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    return { installations: data ?? [] };
  });

// ============ Onglet Déposes à valider ============
export const adminListDeposePending = createServerFn({ method: "GET" })
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
        "id, spot_name, company, email, start_date, end_date, depose_photos, depose_status, depose_notes, depose_reviewed_at, depose_fee_cents, depose_payout_status, depose_stripe_transfer_id, depose_installer_user_id, created_at",
      )
      .not("depose_photos", "is", null)
      .order("end_date", { ascending: true })
      .limit(200);
    return { depositions: data ?? [] };
  });

// ============ Onglet Comptes Stripe inactifs ============
export const adminListInactiveStripeAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Comptes avec Stripe démarré mais onboarding incomplet
    const { data: incomplete } = await supabaseAdmin
      .from("payee_profiles")
      .select("id, user_id, kind, full_name, phone, city, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, status, created_at")
      .not("stripe_account_id", "is", null)
      .or("stripe_charges_enabled.eq.false,stripe_payouts_enabled.eq.false")
      .order("created_at", { ascending: false })
      .limit(200);

    // Comptes inscrits depuis > 30 jours sans jamais démarrer Stripe
    const { data: neverStarted } = await supabaseAdmin
      .from("payee_profiles")
      .select("id, user_id, kind, full_name, phone, city, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, status, created_at")
      .is("stripe_account_id", null)
      .lt("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    return {
      incomplete: incomplete ?? [],
      neverStarted: neverStarted ?? [],
    };
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

export const adminReviewDepose = createServerFn({ method: "POST" })
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
        depose_status: data.approve ? "approved" : "rejected",
        depose_notes: data.approve
          ? (data.notes ?? "✅ Dépose conforme validée par MoveSpot.")
          : data.notes!,
        depose_reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.campaignRequestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Onglet Véhicules ============
export const adminListVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("vehicles")
      .select("id, name, type, condition, status, zones, price_per_day, km_per_day, surface_m2, photos, description, ai_verification, admin_notes, created_at, owner_id")
      .order("created_at", { ascending: false })
      .limit(200);
    return { vehicles: data ?? [] };
  });

export const adminReviewVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        vehicleId: z.string().uuid(),
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vehicles")
      .update({
        status: data.approve ? "approved" : "rejected",
        admin_notes: data.notes ?? (data.approve
          ? "✅ Véhicule approuvé par MoveSpot."
          : "⛔ Véhicule refusé par MoveSpot."),
      } as never)
      .eq("id", data.vehicleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Onglet Analytics ============
export const adminAnalyticsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setDate(since.getDate() - 84); // 12 semaines

    const [{ data: briefs }, { data: campaigns }] = await Promise.all([
      supabaseAdmin
        .from("advertiser_briefs")
        .select("created_at")
        .gte("created_at", since.toISOString()),
      supabaseAdmin
        .from("campaign_requests")
        .select("created_at, payment_status")
        .gte("created_at", since.toISOString()),
    ]);

    function toWeekKey(iso: string): string {
      const d = new Date(iso);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10);
    }

    const weeks: Record<string, { briefs: number; campaigns: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = toWeekKey(d.toISOString());
      weeks[key] = { briefs: 0, campaigns: 0 };
    }

    for (const b of briefs ?? []) {
      const k = toWeekKey(b.created_at as string);
      if (k in weeks) weeks[k].briefs++;
    }
    for (const c of campaigns ?? []) {
      if ((c as { payment_status: string }).payment_status === "paid") {
        const k = toWeekKey((c as { created_at: string }).created_at);
        if (k in weeks) weeks[k].campaigns++;
      }
    }

    return Object.entries(weeks).map(([week, v]) => ({
      week,
      label: new Date(week).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      briefs: v.briefs,
      campaigns: v.campaigns,
    }));
  });

// ============ Onglet Revenus ============
export const adminRevenueData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, total_price, payment_status, company, spot_name, start_date, end_date, created_at")
      .order("created_at", { ascending: false });

    const all = campaigns ?? [];
    const paid = all.filter((c) => (c as { payment_status: string }).payment_status === "paid");
    const totalRevenue = paid.reduce((s, c) => s + (Number((c as { total_price: number | null }).total_price) || 0), 0);
    const commission = Math.round(totalRevenue * 0.3 * 100) / 100;
    const avgTicket = paid.length > 0 ? Math.round((totalRevenue / paid.length) * 100) / 100 : 0;
    const conversionRate = all.length > 0 ? Math.round((paid.length / all.length) * 1000) / 10 : 0;

    const months: Record<string, { revenue: number; commission: number; count: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months[key] = { revenue: 0, commission: 0, count: 0 };
    }
    for (const c of paid) {
      const key = ((c as { created_at: string }).created_at).slice(0, 7);
      if (key in months) {
        const amount = Number((c as { total_price: number | null }).total_price) || 0;
        months[key].revenue += amount;
        months[key].commission += amount * 0.3;
        months[key].count++;
      }
    }

    const monthly = Object.entries(months).map(([month, v]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      revenue: Math.round(v.revenue * 100) / 100,
      commission: Math.round(v.commission * 100) / 100,
      count: v.count,
    }));

    const recentPaid = paid.slice(0, 20).map((c) => {
      const row = c as { id: string; company: string | null; spot_name: string | null; total_price: number | null; start_date: string | null; end_date: string | null; created_at: string };
      return {
        id: row.id,
        company: row.company,
        spotName: row.spot_name,
        totalPrice: Number(row.total_price) || 0,
        commission: Math.round((Number(row.total_price) || 0) * 0.3 * 100) / 100,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at,
      };
    });

    return { totalRevenue, commission, avgTicket, conversionRate, paidCount: paid.length, totalCount: all.length, monthly, recentPaid };
  });

// ============ Onglet Utilisateurs ============
export type AdminUserRow = {
  user_id: string;
  full_name: string | null;
  role: "advertiser" | "owner" | "provider" | "partner";
  detail: string | null;
  status: string;
  created_at: string;
};

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [advRes, ownRes, payRes, parRes] = await Promise.all([
      supabaseAdmin.from("advertiser_profiles").select("user_id, full_name, company, account_type, created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("owner_profiles").select("user_id, full_name, phone, city, created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("payee_profiles").select("user_id, full_name, kind, certification_status, status, created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("partner_profiles").select("user_id, full_name, status, created_at").order("created_at", { ascending: false }).limit(300),
    ]);

    const users: AdminUserRow[] = [
      ...(advRes.data ?? []).map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name as string | null,
        role: "advertiser" as const,
        detail: ((u as { company?: string | null }).company ?? (u as { account_type?: string | null }).account_type ?? null) as string | null,
        status: "active",
        created_at: u.created_at as string,
      })),
      ...(ownRes.data ?? []).map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name as string | null,
        role: "owner" as const,
        detail: ((u as { city?: string | null }).city ?? (u as { phone?: string | null }).phone ?? null) as string | null,
        status: "active",
        created_at: u.created_at as string,
      })),
      ...(payRes.data ?? []).map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name as string | null,
        role: "provider" as const,
        detail: `${(u as { kind: string }).kind} — ${(u as { certification_status: string }).certification_status}`,
        status: ((u as { status?: string | null }).status ?? "pending") as string,
        created_at: u.created_at as string,
      })),
      ...(parRes.data ?? []).map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name as string | null,
        role: "partner" as const,
        detail: null,
        status: ((u as { status?: string | null }).status ?? "pending") as string,
        created_at: u.created_at as string,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { users, total: users.length };
  });

// ============ Onglet Parrainage annonceurs ============

export interface AdminReferralRow {
  id: string;
  status: "pending" | "credited";
  created_at: string;
  credited_at: string | null;
  referrer_name: string;
  referrer_code: string;
  referee_name: string;
  referee_user_id: string | null;
}

export const adminListReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin as any)
      .from("advertiser_referral_rewards")
      .select(`
        id, status, created_at, credited_at,
        referrer:referrer_id(full_name, company, referral_code, user_id),
        referee:referee_id(full_name, company, user_id)
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const rows: AdminReferralRow[] = (data ?? []).map((r: any) => ({
      id: r.id as string,
      status: r.status as "pending" | "credited",
      created_at: r.created_at as string,
      credited_at: r.credited_at as string | null,
      referrer_name: (r.referrer?.company || r.referrer?.full_name || "—") as string,
      referrer_code: (r.referrer?.referral_code || "—") as string,
      referee_name: (r.referee?.company || r.referee?.full_name || "—") as string,
      referee_user_id: (r.referee?.user_id || null) as string | null,
    }));

    const pending = rows.filter((r) => r.status === "pending").length;
    const credited = rows.filter((r) => r.status === "credited").length;

    return { rows, pending, credited, total: rows.length };
  });

export const adminCreditReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ refereeUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any).rpc("credit_advertiser_referral", {
      p_referee_user_id: data.refereeUserId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Compteurs pending (KPI bar + badges) ============
export const adminPendingCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [vehiclesRes, briefsRes, posesRes, deposesRes, poseursRes, stripeRes] = await Promise.all([
      supabaseAdmin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("advertiser_briefs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("campaign_requests").select("id", { count: "exact", head: true }).eq("installation_status" as never, "pending_approval"),
      supabaseAdmin.from("campaign_requests").select("id", { count: "exact", head: true }).eq("depose_status" as never, "pending_approval"),
      supabaseAdmin.from("payee_profiles").select("id", { count: "exact", head: true }).eq("certification_status" as never, "pending"),
      supabaseAdmin.from("payee_profiles").select("stripe_account_id, stripe_charges_enabled").eq("kind" as never, "installer"),
    ]);

    const stripeIncomplete = (stripeRes.data ?? []).filter(
      (p: { stripe_account_id: string | null; stripe_charges_enabled: boolean | null }) =>
        p.stripe_account_id && !p.stripe_charges_enabled,
    ).length;
    const stripeNeverStarted = (stripeRes.data ?? []).filter(
      (p: { stripe_account_id: string | null }) => !p.stripe_account_id,
    ).length;

    return {
      vehicles: vehiclesRes.count ?? 0,
      briefs: briefsRes.count ?? 0,
      poses: posesRes.count ?? 0,
      deposes: deposesRes.count ?? 0,
      poseurs: poseursRes.count ?? 0,
      stripe: stripeIncomplete + stripeNeverStarted,
    };
  });
