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
  photo: PhotoSchema.optional(),
  photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

// ─── Création d'un signalement (propriétaire connecté) ────────────────────────

export const submitIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SubmitIncidentInput>) => SubmitIncidentInput.parse(d))
  .handler(async ({ data, context }) => {
    assertRateLimit(`incident:${context.userId}`, { maxRequests: 10, windowMs: 10 * 60_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

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

    // Upload photo optionnelle dans le bucket "incident-reports"
    if (data.photo && data.photoMimeType) {
      const mime = data.photoMimeType;
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${data.vehicleId}/${ts}.${ext}`;
      const buf = Buffer.from(data.photo, "base64");
      const { error: upErr } = await supabaseAdmin.storage
        .from("incident-reports")
        .upload(path, buf, { contentType: mime, upsert: true });
      if (!upErr) photoPath = path;
    }

    const { data: report, error } = await supabaseAdmin
      .from("incident_reports" as never)
      .insert({
        user_id: userId,
        vehicle_id: data.vehicleId,
        campaign_request_id: data.campaignRequestId ?? null,
        incident_type: data.incidentType,
        description: data.description ?? null,
        photo_path: photoPath,
        status: "open",
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Notifier les admins — push + email (best-effort)
    try {
      const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
      const { data: admins } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role" as never, "admin");

      const v = veh as unknown as { name: string };

      for (const admin of (admins ?? []) as Array<{ user_id: string }>) {
        await sendWebPushToUser(admin.user_id, {
          title: "⚠️ Nouveau signalement sinistre",
          body: `Véhicule ${v.name} — ${data.incidentType}`,
          url: "/admin/dashboard",
        }).catch(() => {});
      }
    } catch {
      /* best-effort */
    }

    // Email admin (best-effort)
    try {
      const { sendAppEmail } = await import("@/lib/email/send.server");
      let reporterEmail: string | undefined;
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        reporterEmail = authUser?.user?.email ?? undefined;
      } catch {
        /* best-effort */
      }
      await sendAppEmail({
        templateName: "admin-incident-alert",
        recipientEmail: "",
        idempotencyKey: `incident-alert-${(report as unknown as { id: string }).id}`,
        templateData: {
          vehicleName: (veh as unknown as { name: string }).name,
          incidentType: data.incidentType,
          reporterEmail,
          description: data.description,
          createdAt: new Date().toLocaleString("fr-FR"),
        },
      });
    } catch {
      /* best-effort */
    }

    return { ok: true, id: (report as unknown as { id: string }).id };
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
  status: string;
  admin_note: string | null;
};

export const listMyIncidentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("incident_reports" as never)
      .select(
        `id, created_at, vehicle_id, incident_type, description, photo_path, status, admin_note,
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
          status: row.status as string,
          admin_note: row.admin_note as string | null,
        } satisfies OwnerIncidentReport;
      }),
    };
  });

// ─── Admin : lister tous les signalements ouverts ────────────────────────────

export type AdminIncidentReport = OwnerIncidentReport & {
  user_id: string;
  user_email: string | null;
  campaign_request_id: string | null;
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
         incident_type, description, photo_path, status, admin_note,
         vehicles:vehicle_id ( name )`,
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
          incident_type: row.incident_type as IncidentType,
          description: row.description as string | null,
          photo_path: row.photo_path as string | null,
          status: row.status as string,
          admin_note: row.admin_note as string | null,
        } satisfies AdminIncidentReport;
      }),
    };
  });

// ─── Admin : changer le statut d'un signalement ──────────────────────────────

const UpdateIncidentInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "closed"]),
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
    if (data.status === "closed") patch.resolved_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("incident_reports" as never)
      .update(patch as never)
      .eq("id" as never, data.id);

    if (error) throw new Error(error.message);
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
