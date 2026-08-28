import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InvoiceData = {
  campaign: {
    id: string;
    spot_name: string;
    spot_location: string | null;
    spot_price: number | null;
    days_count: number | null;
    total_price: number | null;
    start_date: string | null;
    end_date: string | null;
    payment_status: string;
    created_at: string;
    route_zones: string[] | null;
    estimated_impressions_per_day: number | null;
  };
  profile: {
    full_name: string;
    company: string | null;
    siret: string | null;
    address: string | null;
    phone: string | null;
  };
  email: string;
};

export const getInvoiceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ campaignId: z.string().uuid() }))
  .handler(async ({ context, data }): Promise<InvoiceData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        "id, spot_name, spot_location, spot_price, days_count, total_price, start_date, end_date, payment_status, created_at, route_zones, estimated_impressions_per_day",
      )
      .eq("id", data.campaignId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error || !campaign) throw new Error("Campagne introuvable ou accès non autorisé");

    const { data: profile } = await supabaseAdmin
      .from("advertiser_profiles")
      .select("full_name, company, siret, address, phone")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(context.userId);

    return {
      campaign: campaign as InvoiceData["campaign"],
      profile: profile ?? { full_name: "Annonceur", company: null, siret: null, address: null, phone: null },
      email: userAuth?.user?.email ?? "",
    };
  });
