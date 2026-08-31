import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDrivingRules } from "@/lib/fleet/driving-rules";

// Retourne "HH:MM" dans le fuseau IANA indiqué pour comparer aux plages horaires
// stockées sans timezone dans daily_start_time / daily_end_time.
function localTime(isoTs: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoTs));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

// Vérifie qu'un timestamp tombe dans la plage horaire quotidienne d'une campagne.
// Si aucune plage n'est définie on laisse passer (comportement sans restriction).
function isWithinDailyWindow(
  isoTs: string,
  dailyStartTime: string | null,
  dailyEndTime: string | null,
  timezone = "Europe/Paris",
): boolean {
  if (!dailyStartTime || !dailyEndTime) return true;
  const t = localTime(isoTs, timezone);
  return t >= dailyStartTime && t <= dailyEndTime;
}

const PositionSchema = z.object({
  vehicleId: z.string().uuid(),
  campaignRequestId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
});

export const pushPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PositionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the caller owns or is assigned to this vehicle
    const { data: ownedVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", data.vehicleId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!ownedVehicle) {
      const { data: driverRec } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!driverRec) throw new Error("Accès non autorisé à ce véhicule.");
      const { data: driverVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("id", data.vehicleId)
        .eq("driver_id", driverRec.id)
        .maybeSingle();
      if (!driverVehicle) throw new Error("Accès non autorisé à ce véhicule.");
    }

    // Même protection que pushPositionBatch : on ne taggue le point avec la
    // campagne que si l'heure courante est dans la plage horaire déclarée.
    let campaignRequestId = data.campaignRequestId ?? null;
    if (campaignRequestId) {
      const { data: cr } = await supabase
        .from("campaign_requests")
        .select("daily_start_time, daily_end_time, timezone")
        .eq("id", campaignRequestId)
        .maybeSingle();
      if (!isWithinDailyWindow(new Date().toISOString(), cr?.daily_start_time ?? null, cr?.daily_end_time ?? null, cr?.timezone ?? "Europe/Paris")) {
        campaignRequestId = null;
      }
    }

    const { error } = await supabase.from("vehicle_positions").insert({
      vehicle_id: data.vehicleId,
      campaign_request_id: campaignRequestId,
      owner_id: userId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BatchSchema = z.object({
  vehicleId: z.string().uuid(),
  campaignRequestId: z.string().uuid().nullable().optional(),
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
});

export const pushPositionBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the caller owns or is assigned to this vehicle
    const { data: ownedVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", data.vehicleId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!ownedVehicle) {
      const { data: driverRec } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!driverRec) throw new Error("Accès non autorisé à ce véhicule.");
      const { data: driverVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("id", data.vehicleId)
        .eq("driver_id", driverRec.id)
        .maybeSingle();
      if (!driverVehicle) throw new Error("Accès non autorisé à ce véhicule.");
    }

    // Récupère la plage horaire de la campagne pour ne taguer les points
    // qu'à l'intérieur de la fenêtre déclarée (RGPD – minimisation des données,
    // Directive plateforme 2024/2831 – protection des travailleurs).
    let campaignWindow: { daily_start_time: string | null; daily_end_time: string | null; timezone: string } | null = null;
    if (data.campaignRequestId) {
      const { data: cr } = await supabase
        .from("campaign_requests")
        .select("daily_start_time, daily_end_time, timezone")
        .eq("id", data.campaignRequestId)
        .maybeSingle();
      campaignWindow = cr ? { ...cr, timezone: cr.timezone ?? "Europe/Paris" } : null;
    }

    const rows = data.points.map((p: any) => {
      const inWindow =
        !data.campaignRequestId ||
        isWithinDailyWindow(
          p.recordedAt,
          campaignWindow?.daily_start_time ?? null,
          campaignWindow?.daily_end_time ?? null,
          campaignWindow?.timezone ?? "Europe/Paris",
        );
      return {
        vehicle_id: data.vehicleId,
        // Hors plage : on stocke le point (usage flotte du propriétaire) mais
        // sans l'associer à la campagne → les déplacements privés restent privés.
        campaign_request_id: inWindow ? (data.campaignRequestId ?? null) : null,
        owner_id: userId,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        recorded_at: p.recordedAt,
      };
    });
    const { error } = await supabase.from("vehicle_positions").insert(rows);
    if (error) throw new Error(error.message);

    // Agrégation des métriques de couverture : uniquement les points dans la plage
    let metrics: {
      points_total: number;
      points_in_zone: number;
      distance_in_zone_m: number;
      active_minutes: number;
    } | null = null;
    if (data.campaignRequestId) {
      const inWindowPoints = data.points.filter((p: any) =>
        isWithinDailyWindow(
          p.recordedAt,
          campaignWindow?.daily_start_time ?? null,
          campaignWindow?.daily_end_time ?? null,
          campaignWindow?.timezone ?? "Europe/Paris",
        ),
      );
      if (inWindowPoints.length > 0) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: m } = await supabaseAdmin.rpc("record_campaign_gps_batch", {
          p_campaign_id: data.campaignRequestId,
          p_points: inWindowPoints as never,
        });
        metrics = (Array.isArray(m) ? m[0] : m) ?? null;
      }
    }

    return { ok: true, inserted: rows.length, metrics };
  });

export const getCampaignMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaignRequestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("campaign_metrics")
      .select(
        "day, distance_traveled_m, distance_traveled_in_zone_m, active_minutes, points_total, points_in_zone",
      )
      .eq("campaign_request_id", data.campaignRequestId)
      .order("day", { ascending: true });
    if (error) throw new Error(error.message);
    const days = rows ?? [];
    const totals = days.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: any, d: any) => ({
        distanceM: acc.distanceM + (d.distance_traveled_m ?? 0),
        distanceInZoneM: acc.distanceInZoneM + (d.distance_traveled_in_zone_m ?? 0),
        activeMinutes: acc.activeMinutes + (d.active_minutes ?? 0),
        pointsTotal: acc.pointsTotal + (d.points_total ?? 0),
        pointsInZone: acc.pointsInZone + (d.points_in_zone ?? 0),
      }),
      { distanceM: 0, distanceInZoneM: 0, activeMinutes: 0, pointsTotal: 0, pointsInZone: 0 },
    );
    const coverageRate =
      totals.distanceM > 0 ? totals.distanceInZoneM / totals.distanceM : null;
    return { days, totals, coverageRate };
  });


export const getActiveCampaignForVehicle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ vehicleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from("campaign_requests")
      .select("id, start_date, end_date, spot_name, company, daily_start_time, daily_end_time, country_code, timezone")
      .eq("vehicle_id", data.vehicleId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const campaign = rows?.[0] ?? null;
    // Ne retourner la campagne (et donc n'activer le tag GPS) que si on est
    // dans la plage horaire quotidienne déclarée par l'annonceur.
    if (
      campaign &&
      !isWithinDailyWindow(
        new Date().toISOString(),
        campaign.daily_start_time,
        campaign.daily_end_time,
        campaign.timezone ?? "Europe/Paris",
      )
    ) {
      return { campaign: null };
    }
    return { campaign };
  });

export const getOwnerVehiclesForTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, name, type, status")
      .eq("owner_id", userId)
      .eq("status", "approved");
    if (error) throw new Error(error.message);
    return { vehicles: data ?? [] };
  });

export const getCampaignPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaignRequestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("vehicle_positions")
      .select("lat, lng, recorded_at, speed, heading")
      .eq("campaign_request_id", data.campaignRequestId)
      .order("recorded_at", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return { positions: rows ?? [] };
  });

export const getAdvertiserActiveCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("campaign_requests")
      .select("id, spot_name, vehicle_id, start_date, end_date, status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { campaigns: data ?? [] };
  });

// ─── Analyse des pauses conducteur ───────────────────────────────────────────
// Seuil de détection d'un arrêt : gap de 10+ min entre deux points GPS consécutifs
// (le GpsBatchBuffer n'envoie un nouveau point que si le véhicule a bougé de 10 m+,
// donc un gap temporel = véhicule immobile sur cette durée).
// BREAK_MIN et MAX_CONTINUOUS_MIN sont désormais dérivés du country_code via getDrivingRules.
const STOP_THRESHOLD_MIN = 10;

export type DrivingBlock = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  breakAfterMinutes: number | null; // null = dernier bloc (encore en cours)
  breakAdequate: boolean;
};

export type PauseAnalysis = {
  blocks: DrivingBlock[];
  violations: { blockStart: string; blockEnd: string; durationMinutes: number }[];
  totalDrivingMinutes: number;
  longestBlockMinutes: number;
};

function analyzeDrivingBlocks(
  points: { recorded_at: string; speed: number | null }[],
  countryCode = "EU",
): PauseAnalysis {
  if (points.length < 2) {
    return { blocks: [], violations: [], totalDrivingMinutes: 0, longestBlockMinutes: 0 };
  }

  const rules = getDrivingRules(countryCode);
  const BREAK_MIN = rules.breakMin;
  const MAX_CONTINUOUS_MIN = rules.maxContinuousMin;

  const sorted = [...points].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const blocks: DrivingBlock[] = [];
  let blockStart = sorted[0].recorded_at;
  let blockEnd = sorted[0].recorded_at;

  for (let i = 1; i < sorted.length; i++) {
    const gapMin = (new Date(sorted[i].recorded_at).getTime() - new Date(sorted[i - 1].recorded_at).getTime()) / 60_000;
    if (gapMin >= STOP_THRESHOLD_MIN) {
      const durationMinutes = Math.round(
        (new Date(blockEnd).getTime() - new Date(blockStart).getTime()) / 60_000,
      );
      blocks.push({
        startTime: blockStart,
        endTime: blockEnd,
        durationMinutes,
        breakAfterMinutes: Math.round(gapMin),
        breakAdequate: gapMin >= BREAK_MIN,
      });
      blockStart = sorted[i].recorded_at;
    }
    blockEnd = sorted[i].recorded_at;
  }

  // Dernier bloc (en cours ou terminé sans arrêt détecté)
  const lastDuration = Math.round(
    (new Date(blockEnd).getTime() - new Date(blockStart).getTime()) / 60_000,
  );
  blocks.push({
    startTime: blockStart,
    endTime: blockEnd,
    durationMinutes: lastDuration,
    breakAfterMinutes: null,
    breakAdequate: false,
  });

  const violations = blocks
    .filter((b) => b.durationMinutes > MAX_CONTINUOUS_MIN && !b.breakAdequate)
    .map((b) => ({ blockStart: b.startTime, blockEnd: b.endTime, durationMinutes: b.durationMinutes }));

  return {
    blocks,
    violations,
    totalDrivingMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    longestBlockMinutes: blocks.reduce((m, b) => Math.max(m, b.durationMinutes), 0),
  };
}

export const getCampaignPauseAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaignRequestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: campaignMeta }, { data: rows, error }] = await Promise.all([
      supabase
        .from("campaign_requests")
        .select("country_code")
        .eq("id", data.campaignRequestId)
        .maybeSingle(),
      supabase
        .from("vehicle_positions")
        .select("recorded_at, speed")
        .eq("campaign_request_id", data.campaignRequestId)
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(2000),
    ]);

    if (error) throw new Error(error.message);
    if (!rows || rows.length < 2) return { analysis: null, hasViolation: false };

    const analysis = analyzeDrivingBlocks(rows, campaignMeta?.country_code ?? "EU");
    return { analysis, hasViolation: analysis.violations.length > 0 };
  });
