import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const OBSTACLE_TYPES = [
  { value: "travaux",       label: "Travaux de voirie" },
  { value: "manifestation", label: "Manifestation / cortège" },
  { value: "meteo",         label: "Conditions climatiques extrêmes" },
  { value: "route_barree",  label: "Route barrée / barrage" },
  { value: "accident",      label: "Accident / déviation imposée" },
  { value: "autre",         label: "Autre obstacle" },
] as const;

export type ObstacleType = (typeof OBSTACLE_TYPES)[number]["value"];

// base64 JPEG/PNG/WebP, sans le préfixe data:...; max ~1.5 MB encodé ≈ 1.1 MB décodé
const PhotoSchema = z.string().max(2_200_000);

const ReportSchema = z.object({
  token: z.string().min(10).max(2000),
  obstacleType: z.enum(["travaux", "manifestation", "meteo", "route_barree", "accident", "autre"]),
  description: z.string().max(500).optional(),
  reportedAt: z.string().datetime().optional(),
  // Jusqu'à 4 photos, base64 brut (sans préfixe data:)
  photos: z.array(PhotoSchema).max(4).optional(),
  // Type MIME correspondant à chaque photo (même index)
  photoMimeTypes: z.array(z.enum(["image/jpeg", "image/png", "image/webp"])).max(4).optional(),
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
        campaignId: camp?.id ?? null,
        reportId: report?.id ?? null,
        photoCount: photoPaths.length,
      },
    });

    return { ok: true, reportId: report?.id ?? null, photoCount: photoPaths.length };
  });
