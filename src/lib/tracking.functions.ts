import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { error } = await supabase.from("vehicle_positions").insert({
      vehicle_id: data.vehicleId,
      campaign_request_id: data.campaignRequestId ?? null,
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

export const getActiveCampaignForVehicle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ vehicleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from("campaign_requests")
      .select("id, start_date, end_date, spot_name, company")
      .eq("vehicle_id", data.vehicleId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return { campaign: rows?.[0] ?? null };
  });

export const getOwnerVehiclesForTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, name, vehicle_type, status")
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
