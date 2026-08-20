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

const ReportSchema = z.object({
  token: z.string().min(10).max(2000),
  obstacleType: z.enum(["travaux", "manifestation", "meteo", "route_barree", "accident", "autre"]),
  description: z.string().max(500).optional(),
  reportedAt: z.string().datetime().optional(),
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
      },
    });

    return { ok: true };
  });
