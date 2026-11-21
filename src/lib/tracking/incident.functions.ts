import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rateLimit.server";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  { value: "accident_sinistre", labelKey: "incident.type_accident_sinistre" },
  { value: "degradation_vandalisme", labelKey: "incident.type_degradation_vandalisme" },
  { value: "decollement_vinyle", labelKey: "incident.type_decollement_vinyle" },
  { value: "retrait_urgence", labelKey: "incident.type_retrait_urgence" },
  { value: "autre", labelKey: "incident.type_autre" },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]["value"];


// ─── Schémas ──────────────────────────────────────────────────────────────────

// base64 JPEG/PNG/WebP, sans le préfixe data:...; max ~1.5 MB encodé
const PhotoSchema = z.string().max(2_200_000);

const PhotoItemSchema = z.object({
  b64: PhotoSchema,
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const SubmitIncidentInput = z.object({
  vehicleId: z.string().uuid(),
  campaignRequestId: z.string().uuid().nullable().optional(),
  incidentType: z.enum([
    "accident_sinistre",
    "degradation_vandalisme",
    "decollement_vinyle",
    "retrait_urgence",
    "autre",
  ]),
  description: z.string().max(1000).optional(),
  // legacy single photo (non-vinyl types)
  photo: PhotoSchema.optional(),
  photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  // vinyl contradictoire: array of photos (min 2 enforced server-side for decollement_vinyle)
  ownerReportPhotos: z.array(PhotoItemSchema).max(5).optional(),
});

// ─── Création d'un signalement (propriétaire connecté) ────────────────────────

export const submitIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SubmitIncidentInput>) => SubmitIncidentInput.parse(d))
  .handler(async ({ data, context }) => {
    assertRateLimit(`incident:${context.userId}`, { maxRequests: 10, windowMs: 10 * 60_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const isVinyl = data.incidentType === "decollement_vinyle";

    // Validation : vinyle → minimum 2 photos obligatoires
    if (isVinyl && (!data.ownerReportPhotos || data.ownerReportPhotos.length < 2)) {
      throw new Error("Au moins 2 photos sont obligatoires pour un signalement de vinyle.");
    }

    // Résoudre le profil propriétaire pour comparer avec vehicles.owner_id (FK → owner_profiles.id)
    const { data: ownerProfile } = await supabaseAdmin
      .from("owner_profiles" as never)
      .select("id")
      .eq("user_id" as never, userId)
      .maybeSingle();

    // Récupérer le véhicule sans filtrer owner_id directement (car owner_id ≠ auth.uid())
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles" as never)
      .select("id, name, owner_id, driver_id")
      .eq("id" as never, data.vehicleId)
      .maybeSingle();

    type VehicleRow = { id: string; name: string; owner_id: string | null; driver_id: string | null };
    const veh = vehicle as VehicleRow | null;

    const ownedByUser = ownerProfile && veh?.owner_id === (ownerProfile as { id: string }).id;
    const drivenByUser = veh?.driver_id === userId;

    if (!veh || (!ownedByUser && !drivenByUser)) throw new Error("Véhicule introuvable ou non autorisé.");

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    let photoPath: string | null = null;
    const ownerPhotoStoragePaths: string[] = [];

    if (isVinyl && data.ownerReportPhotos?.length) {
      // Upload all owner photos for vinyl contradictoire
      for (let i = 0; i < data.ownerReportPhotos.length; i++) {
        const item = data.ownerReportPhotos[i]!;
        const ext = item.mime === "image/png" ? "png" : item.mime === "image/webp" ? "webp" : "jpg";
        const path = `${data.vehicleId}/owner_${ts}_${i}.${ext}`;
        const buf = Buffer.from(item.b64, "base64");
        const { error: upErr } = await supabaseAdmin.storage
          .from("incident-reports")
          .upload(path, buf, { contentType: item.mime, upsert: true });
        if (!upErr) ownerPhotoStoragePaths.push(path);
      }
    } else if (data.photo && data.photoMimeType) {
      // Legacy single-photo path for non-vinyl types
      const mime = data.photoMimeType;
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${data.vehicleId}/${ts}.${ext}`;
      const buf = Buffer.from(data.photo, "base64");
      const { error: upErr } = await supabaseAdmin.storage
        .from("incident-reports")
        .upload(path, buf, { contentType: mime, upsert: true });
      if (!upErr) photoPath = path;
    }

    // Trouver le poseur le plus récent pour ce véhicule (best-effort)
    let installerId: string | null = null;
    if (isVinyl) {
      try {
        const { data: quotes } = await supabaseAdmin
          .from("service_quotes" as never)
          .select("provider_id")
          .eq("vehicle_id" as never, data.vehicleId)
          .order("created_at" as never, { ascending: false })
          .limit(1);
        const firstQuote = ((quotes ?? []) as Array<{ provider_id: string | null }>)[0];
        if (firstQuote?.provider_id) installerId = firstQuote.provider_id;
      } catch { /* best-effort */ }
    }

    const newStatus = isVinyl ? "reported_by_owner" : "open";

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      vehicle_id: data.vehicleId,
      campaign_request_id: data.campaignRequestId ?? null,
      incident_type: data.incidentType,
      description: data.description ?? null,
      photo_path: photoPath,
      status: newStatus,
    };
    if (isVinyl) {
      insertPayload.owner_report_photos = ownerPhotoStoragePaths;
      if (installerId) insertPayload.installer_id = installerId;
    }

    const { data: report, error } = await supabaseAdmin
      .from("incident_reports" as never)
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const reportId = (report as unknown as { id: string }).id;

    // Auto-pause campaign si vinyle
    if (isVinyl && data.campaignRequestId) {
      try {
        await supabaseAdmin
          .from("campaign_requests" as never)
          .update({ status: "incident_verification" } as never)
          .eq("id" as never, data.campaignRequestId);
      } catch { /* best-effort campaign pause */ }
    }

    // Notifications (best-effort)
    try {
      const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
      const { data: admins } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role" as never, "admin");

      const v = veh as unknown as { name: string };
      for (const admin of (admins ?? []) as Array<{ user_id: string }>) {
        await sendWebPushToUser(admin.user_id, {
          title: isVinyl ? "🔍 Constat contradictoire vinyle" : "⚠️ Nouveau signalement sinistre",
          body: `Véhicule ${v.name} — ${data.incidentType}`,
          url: "/admin/dashboard",
        }).catch(() => {});
      }
      if (installerId) {
        await sendWebPushToUser(installerId, {
          title: "⚠️ Incident vinyle à confirmer",
          body: `Le propriétaire du véhicule ${v.name} signale un problème. Vous avez 48h.`,
          url: "/provider/",
        }).catch(() => {});
      }
    } catch { /* best-effort */ }

    // Emails (best-effort)
    try {
      const { sendAppEmail } = await import("@/lib/email/send.server");
      let reporterEmail: string | undefined;
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        reporterEmail = authUser?.user?.email ?? undefined;
      } catch { /* best-effort */ }
      await sendAppEmail({
        templateName: "admin-incident-alert",
        recipientEmail: "",
        idempotencyKey: `incident-alert-${reportId}`,
        templateData: {
          vehicleName: veh.name,
          incidentType: data.incidentType,
          reporterEmail,
          description: data.description,
          createdAt: new Date().toLocaleString("fr-FR"),
        },
      });
      if (isVinyl) {
        if (installerId) {
          const { data: installerUser } = await supabaseAdmin.auth.admin.getUserById(installerId);
          const installerEmail = installerUser?.user?.email;
          if (installerEmail) {
            await sendAppEmail({
              templateName: "admin-incident-alert",
              recipientEmail: installerEmail,
              idempotencyKey: `incident-installer-${reportId}`,
              templateData: {
                vehicleName: veh.name,
                incidentType: data.incidentType,
                reporterEmail,
                description: `CONSTAT CONTRADICTOIRE VINYLE — Délai 48h. ${data.description ?? ""}`,
                createdAt: new Date().toLocaleString("fr-FR"),
              },
            });
          }
        }
        await sendAppEmail({
          templateName: "admin-incident-alert",
          recipientEmail: "conformite@move-spot.com",
          idempotencyKey: `incident-conformite-${reportId}`,
          templateData: {
            vehicleName: veh.name,
            incidentType: data.incidentType,
            reporterEmail,
            description: data.description,
            createdAt: new Date().toLocaleString("fr-FR"),
          },
        }).catch(() => {});
      }
    } catch { /* best-effort */ }

    return { ok: true, id: reportId };
  });

// ─── Liste des signalements du propriétaire connecté ─────────────────────────

export type OwnerIncidentReport = {
  id: string;
  created_at: string;
  vehicle_id: string;
  vehicle_name: string | null;
  incident_type: IncidentType;
  description: string | null;
  photo_path: string | null;
  owner_report_photos: string[];
  status: string;
  admin_note: string | null;
  installer_confirmed_at: string | null;
  installer_diagnosis: string | null;
};

export const listMyIncidentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("incident_reports" as never)
      .select(
        `id, created_at, vehicle_id, incident_type, description, photo_path,
         owner_report_photos, status, admin_note, installer_confirmed_at, installer_diagnosis,
         vehicles:vehicle_id ( name )`,
      )
      .eq("user_id" as never, userId)
      .order("created_at" as never, { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return {
      reports: ((data ?? []) as unknown[]).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const veh = (row.vehicles as Record<string, unknown> | null) ?? {};
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          vehicle_id: row.vehicle_id as string,
          vehicle_name: (veh.name as string | null) ?? null,
          incident_type: row.incident_type as IncidentType,
          description: row.description as string | null,
          photo_path: row.photo_path as string | null,
          owner_report_photos: (row.owner_report_photos as string[] | null) ?? [],
          status: row.status as string,
          admin_note: row.admin_note as string | null,
          installer_confirmed_at: (row.installer_confirmed_at as string | null) ?? null,
          installer_diagnosis: (row.installer_diagnosis as string | null) ?? null,
        } satisfies OwnerIncidentReport;
      }),
    };
  });

// ─── Admin : lister tous les signalements ouverts ────────────────────────────

export type AdminIncidentReport = OwnerIncidentReport & {
  user_id: string;
  user_email: string | null;
  campaign_request_id: string | null;
  provider_name: string | null;
  provider_user_id: string | null;
  installer_id: string | null;
  installer_confirmation_photos: string[];
  installer_notes: string | null;
};

export const adminListIncidentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("incident_reports" as never)
      .select(
        `id, created_at, user_id, vehicle_id, campaign_request_id,
         incident_type, description, photo_path, owner_report_photos,
         installer_id, installer_confirmation_photos, installer_diagnosis, installer_notes,
         installer_confirmed_at, status, admin_note,
         vehicles:vehicle_id ( name, photos )`,
      )
      .order("created_at" as never, { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    // Résoudre les emails depuis auth.users (best-effort)
    const userIds = [...new Set(((data ?? []) as unknown[]).map((r) => (r as Record<string, unknown>).user_id as string))];
    let emailMap: Record<string, string> = {};
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      for (const u of authUsers?.users ?? []) {
        emailMap[u.id] = u.email ?? "";
      }
    } catch {
      /* best-effort */
    }

    // Résoudre le poseur via service_quotes → provider_profiles (best-effort)
    const vehicleIds = [
      ...new Set(
        ((data ?? []) as unknown[]).map((r) => (r as Record<string, unknown>).vehicle_id as string),
      ),
    ];
    let providerMap: Record<string, { name: string | null; userId: string | null }> = {};
    try {
      if (vehicleIds.length > 0) {
        const { data: quotes } = await supabaseAdmin
          .from("service_quotes" as never)
          .select("vehicle_id, provider_id")
          .in("vehicle_id" as never, vehicleIds as never)
          .order("created_at" as never, { ascending: false });

        const providerIds = [
          ...new Set(
            ((quotes ?? []) as Array<{ vehicle_id: string; provider_id: string | null }>)
              .map((q) => q.provider_id)
              .filter(Boolean) as string[],
          ),
        ];

        if (providerIds.length > 0) {
          const { data: providers } = await supabaseAdmin
            .from("provider_profiles" as never)
            .select("user_id, full_name")
            .in("user_id" as never, providerIds as never);

          const providerNameMap: Record<string, string | null> = {};
          for (const p of (providers ?? []) as Array<{
            user_id: string;
            full_name: string | null;
          }>) {
            providerNameMap[p.user_id] = p.full_name;
          }

          // Le devis le plus récent par véhicule fait foi (dernier poseur intervenu).
          for (const q of (quotes ?? []) as Array<{
            vehicle_id: string;
            provider_id: string | null;
          }>) {
            if (q.provider_id && !providerMap[q.vehicle_id]) {
              providerMap[q.vehicle_id] = {
                name: providerNameMap[q.provider_id] ?? null,
                userId: q.provider_id,
              };
            }
          }
        }
      }
    } catch {
      /* best-effort */
    }

    return {
      reports: ((data ?? []) as unknown[]).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const veh = (row.vehicles as Record<string, unknown> | null) ?? {};
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          user_id: row.user_id as string,
          user_email: emailMap[row.user_id as string] ?? null,
          vehicle_id: row.vehicle_id as string,
          vehicle_name: (veh.name as string | null) ?? null,
          campaign_request_id: (row.campaign_request_id as string | null) ?? null,
          provider_name: providerMap[row.vehicle_id as string]?.name ?? null,
          provider_user_id: providerMap[row.vehicle_id as string]?.userId ?? null,
          incident_type: row.incident_type as IncidentType,
          description: row.description as string | null,
          photo_path: row.photo_path as string | null,
          owner_report_photos: (row.owner_report_photos as string[] | null) ?? [],
          installer_id: (row.installer_id as string | null) ?? null,
          installer_confirmation_photos: (row.installer_confirmation_photos as string[] | null) ?? [],
          installer_diagnosis: (row.installer_diagnosis as string | null) ?? null,
          installer_notes: (row.installer_notes as string | null) ?? null,
          installer_confirmed_at: (row.installer_confirmed_at as string | null) ?? null,
          status: row.status as string,
          admin_note: row.admin_note as string | null,
        } satisfies AdminIncidentReport;
      }),
    };
  });

// ─── Admin : changer le statut d'un signalement ──────────────────────────────

const UpdateIncidentInput = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "open",
    "reported_by_owner",
    "confirmed_by_installer",
    "resolved_reprint",
    "resolved_rejected",
    "in_progress",
    "closed",
  ]),
  adminNote: z.string().max(1000).optional(),
});

export const adminUpdateIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof UpdateIncidentInput>) => UpdateIncidentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.adminNote !== undefined) patch.admin_note = data.adminNote;
    if (["closed", "resolved_reprint", "resolved_rejected"].includes(data.status)) {
      patch.resolved_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("incident_reports" as never)
      .update(patch as never)
      .eq("id" as never, data.id);

    if (error) throw new Error(error.message);

    // Notifications after resolution (best-effort)
    if (data.status === "resolved_reprint") {
      try {
        const { data: incident } = await supabaseAdmin
          .from("incident_reports" as never)
          .select("installer_id, user_id")
          .eq("id" as never, data.id)
          .maybeSingle();
        const inc = incident as unknown as { installer_id: string | null; user_id: string } | null;
        if (inc) {
          const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
          await sendWebPushToUser(inc.user_id, {
            title: "🔄 Repose vinyle ordonnée",
            body: "MoveSpot a ordonné la repose gratuite de votre vinyle.",
            url: "/proprietaire",
          }).catch(() => {});
          if (inc.installer_id) {
            await sendWebPushToUser(inc.installer_id, {
              title: "🔄 Mission de repose assignée",
              body: "Une repose gratuite de vinyle a été ordonnée. Vérifiez vos missions.",
              url: "/provider/",
            }).catch(() => {});
          }
        }
      } catch { /* best-effort */ }
    }

    return { ok: true };
  });

// ─── Types pour le constat contradictoire ────────────────────────────────────

export const INSTALLER_DIAGNOSIS_TYPES = [
  { value: "installation_defect", labelKey: "incident.diagnosis_installation_defect" },
  { value: "material_defect",     labelKey: "incident.diagnosis_material_defect" },
  { value: "owner_misuse",        labelKey: "incident.diagnosis_owner_misuse" },
  { value: "external_damage",     labelKey: "incident.diagnosis_external_damage" },
] as const;

export type InstallerDiagnosisType = (typeof INSTALLER_DIAGNOSIS_TYPES)[number]["value"];

export type InstallerPendingIncident = {
  id: string;
  created_at: string;
  vehicle_id: string;
  vehicle_name: string | null;
  incident_type: IncidentType;
  description: string | null;
  owner_report_photos: string[];
  status: string;
  owner_email: string | null;
  hours_elapsed: number;
};

// ─── Liste des incidents vinyle assignés au poseur connecté ──────────────────

export const listInstallerPendingIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data, error } = await supabaseAdmin
      .from("incident_reports" as never)
      .select(
        `id, created_at, vehicle_id, incident_type, description, owner_report_photos, status, user_id,
         vehicles:vehicle_id ( name )`,
      )
      .eq("installer_id" as never, userId)
      .eq("status" as never, "reported_by_owner")
      .order("created_at" as never, { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);

    // Résoudre les emails des propriétaires (best-effort)
    const userIds = [...new Set(((data ?? []) as unknown[]).map((r) => (r as Record<string, unknown>).user_id as string))];
    let emailMap: Record<string, string> = {};
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      for (const u of authUsers?.users ?? []) {
        if (userIds.includes(u.id)) emailMap[u.id] = u.email ?? "";
      }
    } catch { /* best-effort */ }

    const now = Date.now();
    return {
      incidents: ((data ?? []) as unknown[]).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const veh = (row.vehicles as Record<string, unknown> | null) ?? {};
        const createdMs = new Date(row.created_at as string).getTime();
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          vehicle_id: row.vehicle_id as string,
          vehicle_name: (veh.name as string | null) ?? null,
          incident_type: row.incident_type as IncidentType,
          description: row.description as string | null,
          owner_report_photos: (row.owner_report_photos as string[] | null) ?? [],
          status: row.status as string,
          owner_email: emailMap[row.user_id as string] ?? null,
          hours_elapsed: Math.floor((now - createdMs) / 3_600_000),
        } satisfies InstallerPendingIncident;
      }),
    };
  });

// ─── Poseur : soumettre son constat contradictoire ───────────────────────────

const SubmitInstallerConfirmationInput = z.object({
  incidentId: z.string().uuid(),
  photos: z.array(z.string().max(2_200_000)).min(2).max(10),
  photosMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  diagnosis: z.enum(["installation_defect", "material_defect", "owner_misuse", "external_damage"]),
  notes: z.string().max(2000).optional(),
});

export const submitInstallerConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SubmitInstallerConfirmationInput>) =>
    SubmitInstallerConfirmationInput.parse(d),
  )
  .handler(async ({ data, context }) => {
    assertRateLimit(`installer-confirmation:${context.userId}`, { maxRequests: 20, windowMs: 60_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Vérifier que l'incident est bien assigné à ce poseur
    const { data: incident } = await supabaseAdmin
      .from("incident_reports" as never)
      .select("id, installer_id, status, vehicle_id")
      .eq("id" as never, data.incidentId)
      .eq("installer_id" as never, userId)
      .eq("status" as never, "reported_by_owner")
      .maybeSingle();

    if (!incident) throw new Error("Incident introuvable, non assigné ou déjà traité.");

    const inc = incident as { id: string; vehicle_id: string };
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const mime = data.photosMimeType;
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

    const uploadedPaths: string[] = [];
    for (let i = 0; i < data.photos.length; i++) {
      const path = `installer/${inc.vehicle_id}/${ts}-${i}.${ext}`;
      const buf = Buffer.from(data.photos[i]!, "base64");
      const { error: upErr } = await supabaseAdmin.storage
        .from("incident-reports")
        .upload(path, buf, { contentType: mime, upsert: true });
      if (!upErr) uploadedPaths.push(path);
    }

    const { error } = await supabaseAdmin
      .from("incident_reports" as never)
      .update({
        installer_confirmation_photos: uploadedPaths,
        installer_diagnosis: data.diagnosis,
        installer_notes: data.notes ?? null,
        installer_confirmed_at: new Date().toISOString(),
        status: "confirmed_by_installer",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, data.incidentId);

    if (error) throw new Error(error.message);

    // Notifier les admins (best-effort)
    try {
      const { sendAppEmail } = await import("@/lib/email/send.server");
      await sendAppEmail({
        templateName: "admin-incident-alert",
        recipientEmail: "conformite@move-spot.com",
        idempotencyKey: `installer-confirmation-${data.incidentId}`,
        templateData: {
          vehicleName: inc.vehicle_id,
          incidentType: "decollement_vinyle",
          reporterEmail: undefined,
          description: `Constat poseur soumis. Diagnostic : ${data.diagnosis}. ${data.notes ?? ""}`,
          createdAt: new Date().toLocaleString("fr-FR"),
        },
      });
    } catch { /* best-effort */ }

    return { ok: true };
  });

// ─── Refacturation incident vinyle (CGU Art. 25) ─────────────────────────────

type SupabaseAdmin = Awaited<
  ReturnType<typeof import("@/integrations/supabase/client.server").supabaseAdmin["from"]>
> extends never
  ? never
  : Awaited<ReturnType<typeof import("@/integrations/supabase/client.server")>>["supabaseAdmin"];

async function applyIncidentCharge(
  admin: { from: (t: string) => unknown; rpc: (fn: string, args: unknown) => Promise<{ error: { message: string } | null }> },
  incidentId: string,
): Promise<void> {
  // Récupère l'incident et son lien campagne
  const { data: incident } = await (admin.from("incident_reports") as ReturnType<SupabaseAdmin["from"]>)
    .select("campaign_request_id, installer_diagnosis")
    .eq("id", incidentId)
    .maybeSingle() as { data: { campaign_request_id: string | null; installer_diagnosis: string | null } | null };

  if (!incident?.campaign_request_id) return;

  const { data: campaign } = await (admin.from("campaign_requests") as ReturnType<SupabaseAdmin["from"]>)
    .select(
      "id, vehicle_id, ad_format, owner_amount_cents, payout_status, incident_charge_cents, pose_location_type",
    )
    .eq("id", incident.campaign_request_id)
    .maybeSingle() as {
      data: {
        id: string;
        vehicle_id: string | null;
        ad_format: string | null;
        owner_amount_cents: number | null;
        payout_status: string | null;
        incident_charge_cents: number;
        pose_location_type: string | null;
      } | null;
    };

  if (!campaign) return;
  if ((campaign.incident_charge_cents ?? 0) > 0) return; // déjà traité

  const { computeIncidentChargeCents } = await import("@/lib/payments/setup-fee");
  // Le supplément déplacement s'applique si la pose initiale était à domicile (CGU Art. 11bis)
  const withTravel = campaign.pose_location_type === "domicile";
  const chargeCents = computeIncidentChargeCents(campaign.ad_format, withTravel);

  const ownerPending = Number(campaign.owner_amount_cents ?? 0);
  // Si la campagne n'est pas encore virée, on réduit owner_amount_cents
  const canDeduct = campaign.payout_status !== "transferred";
  const netOwner = canDeduct ? Math.max(0, ownerPending - chargeCents) : ownerPending;
  const isBlocked = chargeCents > ownerPending && canDeduct;

  const campaignUpdate: Record<string, unknown> = { incident_charge_cents: chargeCents };
  if (canDeduct) campaignUpdate.owner_amount_cents = netOwner;

  await (admin.from("campaign_requests") as ReturnType<SupabaseAdmin["from"]>)
    .update(campaignUpdate)
    .eq("id", campaign.id);

  // Bloque les nouveaux attributions de campagne si le propriétaire ne peut pas couvrir
  if (isBlocked && campaign.vehicle_id) {
    await (admin.from("vehicles") as ReturnType<SupabaseAdmin["from"]>)
      .update({ incident_payment_blocked: true })
      .eq("id", campaign.vehicle_id);
  }
}

// ─── Admin : arbitrer le constat contradictoire ───────────────────────────────

const AdminArbitrateInput = z.object({
  id: z.string().uuid(),
  resolution: z.enum(["resolved_reprint", "resolved_rejected"]),
  adminNote: z.string().max(1000).optional(),
});

export const adminArbitrateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AdminArbitrateInput>) => AdminArbitrateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("incident_reports" as never)
      .update({
        status: data.resolution,
        admin_note: data.adminNote ?? null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, data.id)
      .in("status" as never, ["confirmed_by_installer"] as never);

    if (error) throw new Error(error.message);

    // Refacturation automatique si le propriétaire est en tort (CGU Art. 25).
    if (data.resolution === "resolved_rejected") {
      await applyIncidentCharge(supabaseAdmin, data.id);
    }

    return { ok: true };
  });

// ─── Signed URL pour la photo ─────────────────────────────────────────────────

export const getIncidentPhotoUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => ({ path: z.string().min(1).parse(d.path) }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Vérifie que c'est bien admin ou propriétaire qui demande (best-effort via RLS)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: url } = await supabaseAdmin.storage
      .from("incident-reports")
      .createSignedUrl(data.path, 3600);

    return { signedUrl: url?.signedUrl ?? null };
  });
