import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const OBSTACLE_TYPES = [
  { value: "travaux", label: "Travaux de voirie" },
  { value: "manifestation", label: "Manifestation / cortège" },
  { value: "meteo", label: "Conditions climatiques extrêmes" },
  { value: "route_barree", label: "Route barrée / barrage" },
  { value: "accident", label: "Accident / déviation imposée" },
  { value: "autre", label: "Autre obstacle" },
] as const;

export type ObstacleType = (typeof OBSTACLE_TYPES)[number]["value"];

export const IMPACT_DURATION_OPTIONS = [
  { value: 30, label: "~30 min" },
  { value: 60, label: "~1 heure" },
  { value: 120, label: "~2 heures" },
  { value: 240, label: "~4 heures" },
  { value: null, label: "Durée inconnue" },
] as const;

// base64 JPEG/PNG/WebP, sans le préfixe data:...; max ~1.5 MB encodé ≈ 1.1 MB décodé
const PhotoSchema = z.string().max(2_200_000);

const ReportSchema = z.object({
  token: z.string().min(10).max(2000),
  obstacleType: z.enum(["travaux", "manifestation", "meteo", "route_barree", "accident", "autre"]),
  description: z.string().max(500).optional(),
  reportedAt: z.string().datetime().optional(),
  // Durée estimée de l'impact en minutes (null = inconnue)
  impactDurationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  // Jusqu'à 4 photos, base64 brut (sans préfixe data:)
  photos: z.array(PhotoSchema).max(4).optional(),
  photoMimeTypes: z
    .array(z.enum(["image/jpeg", "image/png", "image/webp"]))
    .max(4)
    .optional(),
});

export const reportObstacleWithToken = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyQrToken } = await import("@/lib/qr/qr-sign.server");
    const payload = await verifyQrToken(data.token);
    if (!payload) throw new Error("Token invalide.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, name")
      .eq("id", payload.v)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    const { data: camp } = await supabaseAdmin
      .from("campaign_requests")
      .select("id")
      .eq("vehicle_id", payload.v)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const reportedAt = data.reportedAt ?? new Date().toISOString();
    const ts = reportedAt.replace(/[:.]/g, "-").slice(0, 19);

    // Calcul de la fenêtre d'impact
    const impactStart = reportedAt;
    let impactEnd: string | null = null;
    if (data.impactDurationMinutes != null) {
      const endDate = new Date(
        new Date(reportedAt).getTime() + data.impactDurationMinutes * 60_000,
      );
      impactEnd = endDate.toISOString();
    }

    // Upload des photos dans le bucket obstacle-reports
    const photoPaths: string[] = [];
    const photos = data.photos ?? [];
    const mimeTypes = data.photoMimeTypes ?? [];
    for (let i = 0; i < photos.length; i++) {
      const b64 = photos[i]!;
      const mime = mimeTypes[i] ?? "image/jpeg";
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${payload.v}/${ts}-${i}.${ext}`;
      const buf = Buffer.from(b64, "base64");
      const { error: upErr } = await supabaseAdmin.storage
        .from("obstacle-reports")
        .upload(path, buf, { contentType: mime, upsert: true });
      if (!upErr) photoPaths.push(path);
    }

    // Persistance en base
    const { data: report } = await supabaseAdmin
      .from("obstacle_reports")
      .insert({
        vehicle_id: payload.v,
        campaign_id: camp?.id ?? null,
        obstacle_type: data.obstacleType,
        description: data.description ?? null,
        photo_paths: photoPaths,
        reported_at: reportedAt,
        impact_start: impactStart,
        impact_end: impactEnd,
        metadata: { driver_payload: payload },
      })
      .select("id")
      .maybeSingle();

    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    await sendAppEmailSafe({
      templateName: "obstacle-reported",
      recipientEmail: "contact@notify.move-spot.com",
      idempotencyKey: `obstacle-${payload.v}-${reportedAt}`,
      templateData: {
        vehicleName: vehicle?.name ?? payload.v,
        vehicleId: payload.v,
        obstacleType: data.obstacleType,
        description: data.description ?? null,
        reportedAt,
        impactDurationMinutes: data.impactDurationMinutes ?? null,
        campaignId: camp?.id ?? null,
        reportId: report?.id ?? null,
        photoCount: photoPaths.length,
      },
    });

    return { ok: true, reportId: report?.id ?? null, photoCount: photoPaths.length };
  });

// ── Admin: liste les signalements d'obstacles (récents, non encore validés en priorité) ─
export type ObstacleReport = {
  id: string;
  vehicle_id: string | null;
  campaign_id: string | null;
  obstacle_type: string;
  description: string | null;
  photo_paths: string[];
  reported_at: string;
  impact_start: string | null;
  impact_end: string | null;
  admin_validated: boolean;
  admin_validated_at: string | null;
  admin_notes: string | null;
  vehicle_name: string | null;
};

export const adminListObstacleReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // Vérifie que l'appelant est admin
    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("obstacle_reports")
      .select(
        "id, vehicle_id, campaign_id, obstacle_type, description, photo_paths, reported_at, impact_start, impact_end, admin_validated, admin_validated_at, admin_notes",
      )
      .order("reported_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    // Enrichit avec le nom du véhicule
    const vehicleIds = [
      ...new Set((data ?? []).map((r) => r.vehicle_id).filter(Boolean)),
    ] as string[];
    const vehicleNames: Record<string, string> = {};
    if (vehicleIds.length > 0) {
      const { data: vv } = await supabaseAdmin
        .from("vehicles")
        .select("id, name")
        .in("id", vehicleIds);
      for (const v of vv ?? []) vehicleNames[v.id] = v.name;
    }

    return (data ?? []).map((r) => ({
      ...r,
      vehicle_name: r.vehicle_id ? (vehicleNames[r.vehicle_id] ?? null) : null,
    })) as ObstacleReport[];
  });

export const adminValidateObstacleReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        validated: z.boolean(),
        notes: z.string().max(500).optional(),
        // L'admin peut ajuster la fenêtre d'impact
        impactEnd: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updates = {
      admin_validated: data.validated,
      admin_validated_at: new Date().toISOString(),
      admin_notes: data.notes ?? null,
      ...(data.impactEnd !== undefined ? { impact_end: data.impactEnd } : {}),
    };

    const { error } = await supabaseAdmin
      .from("obstacle_reports")
      .update(updates as never)
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// Génère des URLs signées pour les photos d'un signalement
export const adminGetObstaclePhotoUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin
      .from("obstacle_reports")
      .select("photo_paths")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Signalement introuvable.");

    const urls: string[] = [];
    for (const path of report.photo_paths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("obstacle-reports")
        .createSignedUrl(path, 3600);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    return { urls };
  });
