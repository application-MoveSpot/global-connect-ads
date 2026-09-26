import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitCampaignRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignRequestId: z.string().uuid(),
      stars: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
      ratedRole: z.enum(["owner", "driver"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the user owns this campaign
    const { data: camp } = await supabase
      .from("campaign_requests")
      .select("id, status, end_date, vehicle_id")
      .eq("id", data.campaignRequestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!camp) return { ok: false as const, error: "Campagne introuvable." };
    if (camp.status !== "approved") return { ok: false as const, error: "La campagne doit être approuvée pour être notée." };

    try {
      const { error } = await supabaseAdmin
        .from("campaign_ratings" as never)
        .upsert({
          campaign_request_id: data.campaignRequestId,
          rater_user_id: userId,
          rated_role: data.ratedRole,
          stars: data.stars,
          comment: data.comment ?? null,
        } as never, { onConflict: "campaign_request_id,rater_user_id,rated_role" });

      if (error) {
        // Table may not exist yet — return a graceful response
        if (error.code === "42P01") return { ok: true as const, persisted: false };
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const, persisted: true };
    } catch {
      return { ok: true as const, persisted: false };
    }
  });

export const getCampaignRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ campaignRequestId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data: rows } = await supabaseAdmin
        .from("campaign_ratings" as never)
        .select("rated_role, stars, comment" as never)
        .eq("campaign_request_id" as never, data.campaignRequestId)
        .eq("rater_user_id" as never, userId);

      return { ok: true as const, ratings: (rows ?? []) as { rated_role: string; stars: number; comment: string | null }[] };
    } catch {
      return { ok: true as const, ratings: [] };
    }
  });

export const getPublicActiveCampaigns = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, spot_name, spot_location, estimated_impressions_per_day, days_count, start_date, end_date, route_zones, vehicles(type, format_publicitaire, owner_profiles(city))")
      .eq("status", "approved")
      .eq("payment_status", "paid")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(24);

    type CampRow = {
      id: string;
      spot_name: string;
      spot_location: string | null;
      estimated_impressions_per_day: number | null;
      days_count: number | null;
      start_date: string;
      end_date: string;
      route_zones: string[] | null;
      vehicles: { type: string; format_publicitaire: string | null; owner_profiles: { city: string | null } | null } | null;
    };

    return {
      campaigns: ((data ?? []) as unknown as CampRow[]).map((c) => ({
        id: c.id,
        spotName: c.spot_name,
        location: c.spot_location ?? c.vehicles?.owner_profiles?.city ?? null,
        impressionsPerDay: c.estimated_impressions_per_day,
        daysCount: c.days_count,
        startDate: c.start_date,
        endDate: c.end_date,
        vehicleType: c.vehicles?.type ?? null,
        format: c.vehicles?.format_publicitaire ?? null,
        zoneCount: (c.route_zones ?? []).length,
      })),
    };
  });
