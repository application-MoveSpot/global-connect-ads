import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Owner: generate a signed QR token for one of their vehicles ───────────────
export const generateVehicleQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      vehicleId: z.string().uuid(),
      driverId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS-checked: owner can only read their own vehicles
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("id, owner_id, name")
      .eq("id", data.vehicleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) throw new Error("Véhicule introuvable ou accès refusé.");

    const { signQrToken } = await import("@/lib/qr/qr-sign.server");
    const token = await signQrToken({
      k: data.driverId ? "driver" : "vehicle",
      v: vehicle.id,
      o: vehicle.owner_id,
      d: data.driverId ?? null,
      iat: Math.floor(Date.now() / 1000),
      // No expiry for QR stickers; driver magic links could add exp later.
    });
    return { token, vehicleId: vehicle.id, vehicleName: vehicle.name, ownerUserId: userId };
  });

// ── Public: verify a scanned token, return minimal vehicle info ───────────────
export const verifyDriverToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(10).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const { verifyQrToken } = await import("@/lib/qr/qr-sign.server");
    const payload = await verifyQrToken(data.token);
    if (!payload) return { ok: false as const, error: "QR invalide ou expiré." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, name, type, format_publicitaire, status, owner_id, zones")
      .eq("id", payload.v)
      .maybeSingle();
    if (error) return { ok: false as const, error: "Erreur serveur." };
    if (!v) return { ok: false as const, error: "Véhicule introuvable." };
    if (v.owner_id !== payload.o) return { ok: false as const, error: "QR falsifié (propriétaire incohérent)." };
    if (v.status !== "approved") return { ok: false as const, error: "Véhicule non approuvé." };

    return {
      ok: true as const,
      vehicle: { id: v.id, name: v.name, type: v.type, format: v.format_publicitaire, zones: (v.zones ?? []) as string[] },
      driverId: payload.d ?? null,
    };
  });

// ── Public: get active campaign creative files for a LED screen vehicle ──────
export const getVehicleActiveCampaignVideo = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(10).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const { verifyQrToken } = await import("@/lib/qr/qr-sign.server");
    const payload = await verifyQrToken(data.token);
    if (!payload) return { ok: false as const, error: "Token invalide." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date().toISOString().slice(0, 10);
    const { data: camp } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, company, spot_name, creative_files, start_date, end_date, daily_start_time, daily_end_time")
      .eq("vehicle_id", payload.v)
      .eq("status", "approved")
      .eq("installation_status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!camp) return { ok: true as const, campaign: null };

    const paths = (camp.creative_files ?? []) as string[];
    const signedUrls: string[] = [];
    for (const path of paths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("campaign-creatives")
        .createSignedUrl(path, 3600);
      if (signed?.signedUrl) signedUrls.push(signed.signedUrl);
    }

    return {
      ok: true as const,
      campaign: {
        id: camp.id,
        company: camp.company,
        spotName: camp.spot_name,
        signedUrls,
        dailyStart: camp.daily_start_time ?? null,
        dailyEnd: camp.daily_end_time ?? null,
      },
    };
  });

// ── Public: push a position using a signed driver token (no Supabase auth) ────
export const pushPositionWithToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().min(10).max(2000),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().nullable().optional(),
      speed: z.number().nullable().optional(),
      heading: z.number().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyQrToken } = await import("@/lib/qr/qr-sign.server");
    const payload = await verifyQrToken(data.token);
    if (!payload) throw new Error("Token invalide.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find active campaign (if any) to attach the position to.
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

    const { error } = await supabaseAdmin.from("vehicle_positions").insert({
      vehicle_id: payload.v,
      owner_id: payload.o,
      campaign_request_id: camp?.id ?? null,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Public: push a batch of positions with a signed driver token ──────────────
export const pushPositionBatchWithToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().min(10).max(2000),
      points: z
        .array(
          z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            accuracy: z.number().nullable().optional(),
            speed: z.number().nullable().optional(),
            heading: z.number().nullable().optional(),
            recordedAt: z.string().min(10),
          }),
        )
        .min(1)
        .max(500),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyQrToken } = await import("@/lib/qr/qr-sign.server");
    const payload = await verifyQrToken(data.token);
    if (!payload) throw new Error("Token invalide.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

    // Fenêtres d'obstacles validées : les points GPS qui tombent dedans
    // sont exclus des métriques de couverture de campagne.
    const { data: obstacleWindows } = await supabaseAdmin
      .from("obstacle_reports")
      .select("impact_start, impact_end")
      .eq("vehicle_id", payload.v)
      .eq("admin_validated", true)
      .not("impact_end", "is", null);

    const windows = (obstacleWindows ?? []).map((w) => ({
      start: new Date(w.impact_start!).getTime(),
      end:   new Date(w.impact_end!).getTime(),
    }));

    const isInObstacleWindow = (recordedAt: string) => {
      const t = new Date(recordedAt).getTime();
      return windows.some((w) => t >= w.start && t <= w.end);
    };

    const rows = data.points.map((p: any) => ({
      vehicle_id: payload.v,
      owner_id: payload.o,
      campaign_request_id: camp?.id ?? null,
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy ?? null,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      recorded_at: p.recordedAt,
    }));

    const { error } = await supabaseAdmin.from("vehicle_positions").insert(rows);
    if (error) throw new Error(error.message);

    // Met à jour les métriques de couverture — en excluant les points dans les
    // fenêtres d'obstacles validées par l'admin.
    if (camp?.id) {
      const pointsForMetrics = data.points.filter(
        (p: any) => !isInObstacleWindow(p.recordedAt),
      );
      if (pointsForMetrics.length > 0) {
        await supabaseAdmin.rpc("record_campaign_gps_batch", {
          p_campaign_id: camp.id,
          p_points: pointsForMetrics as never,
        });
      }
    }

    return { ok: true, inserted: rows.length };
  });

// ── Driver: get signed QR tokens for vehicles assigned to them ────────────────
export const getDriverVehicleQrTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // vehicles.driver_id stores drivers.id (PK of the drivers table), not auth.users.id
    const { data: driverRow } = await supabaseAdmin
      .from("drivers" as never)
      .select("id")
      .eq("user_id" as never, userId)
      .maybeSingle();

    if (!driverRow) return { vehicles: [] };
    const driverId = (driverRow as { id: string }).id;

    const { data: vehicles, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, name, owner_id, type")
      .eq("driver_id", driverId)
      .eq("status", "approved");

    if (error) throw new Error(error.message);
    if (!vehicles?.length) return { vehicles: [] };

    const { signQrToken } = await import("@/lib/qr/qr-sign.server");

    const result = await Promise.all(
      vehicles.map(async (v) => {
        const token = await signQrToken({
          k: "driver",
          v: v.id,
          o: v.owner_id,
          d: driverId,
          iat: Math.floor(Date.now() / 1000),
        });
        return { vehicleId: v.id, vehicleName: v.name, vehicleType: v.type, token };
      }),
    );

    return { vehicles: result };
  });
