import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOwnerId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("owner_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profil propriétaire introuvable");
  return data.id as string;
}

export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ownerId = await getOwnerId(supabase, userId);
    const { data, error } = await supabase
      .from("drivers")
      .select("id, full_name, phone, email, status, notes, user_id, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { drivers: data ?? [] };
  });

const DriverInput = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(160).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().max(2000).nullable().optional(),
});

export const createDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => DriverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ownerId = await getOwnerId(supabase, userId);
    const { data: row, error } = await supabase
      .from("drivers")
      .insert({
        owner_id: ownerId,
        full_name: data.full_name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { driver: row };
  });

export const updateDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    DriverInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("drivers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("drivers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignDriverToVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      vehicleId: z.string().uuid(),
      driverId: z.string().uuid().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("vehicles")
      .update({ driver_id: data.driverId })
      .eq("id", data.vehicleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFleetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ownerId = await getOwnerId(supabase, userId);

    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, name, type, format_publicitaire, price_per_day, status, driver_id, photos")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (vErr) throw new Error(vErr.message);

    const vehicleIds = (vehicles ?? []).map((v: any) => v.id);

    const [{ data: drivers }, { data: positions }, { data: campaigns }] = await Promise.all([
      supabase
        .from("drivers")
        .select("id, full_name, phone, status")
        .eq("owner_id", ownerId),
      vehicleIds.length
        ? supabase
            .from("vehicle_positions")
            .select("vehicle_id, lat, lng, speed, heading, recorded_at")
            .in("vehicle_id", vehicleIds)
            .gte("recorded_at", new Date(Date.now() - 30 * 60_000).toISOString())
            .order("recorded_at", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [] as any[] }),
      vehicleIds.length
        ? supabase
            .from("campaign_requests")
            .select("id, vehicle_id, spot_name, company, start_date, end_date, total_price, status")
            .in("vehicle_id", vehicleIds)
            .eq("status", "approved")
            .lte("start_date", new Date().toISOString().slice(0, 10))
            .gte("end_date", new Date().toISOString().slice(0, 10))
        : Promise.resolve({ data: [] as any[] }),
    ]);

    // Dedupe latest position per vehicle
    const latestByVehicle = new Map<string, any>();
    for (const p of positions ?? []) {
      if (!latestByVehicle.has(p.vehicle_id)) latestByVehicle.set(p.vehicle_id, p);
    }

    return {
      vehicles: vehicles ?? [],
      drivers: drivers ?? [],
      positions: Array.from(latestByVehicle.values()),
      activeCampaigns: campaigns ?? [],
    };
  });
