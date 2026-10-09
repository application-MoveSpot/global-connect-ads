import { createServerFn } from "@tanstack/react-start";

export type PublicStats = {
  vehiclesApproved: number;
  campaignsLaunched: number;
};

export const getPublicStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<PublicStats> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ count: v }, { count: c }] = await Promise.all([
        supabaseAdmin
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabaseAdmin
          .from("campaign_requests")
          .select("id", { count: "exact", head: true })
          .eq("payment_status", "paid"),
      ]);
      return { vehiclesApproved: v ?? 0, campaignsLaunched: c ?? 0 };
    } catch {
      return { vehiclesApproved: 0, campaignsLaunched: 0 };
    }
  });
