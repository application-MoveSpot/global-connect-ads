import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const notifyBriefCreated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ briefId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [briefRes, profileRes, authRes] = await Promise.all([
      supabase
        .from("advertiser_briefs")
        .select("title, vehicle_types, start_date, end_date, budget_max")
        .eq("id", data.briefId)
        .maybeSingle(),
      supabase
        .from("advertiser_profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    const brief = briefRes.data;
    const email = authRes.data?.user?.email;
    if (!brief || !email) return { ok: true };

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
    const types = (brief.vehicle_types as string[] | null);
    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    await sendAppEmailSafe({
      templateName: "brief-created",
      recipientEmail: email,
      idempotencyKey: `brief-created-${data.briefId}`,
      templateData: {
        advertiserName: profileRes.data?.full_name ?? undefined,
        briefTitle: brief.title,
        vehicleTypes: types?.length ? types.join(", ") : undefined,
        startDate: fmtDate(brief.start_date),
        endDate: fmtDate(brief.end_date),
        budgetMax: brief.budget_max ? `${brief.budget_max} €` : undefined,
        dashboardUrl: `https://move-spot.com/annonceur/briefs/${data.briefId}`,
      },
    });
    return { ok: true };
  });

export const notifyCampaignSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select("spot_name, company, email, start_date, end_date")
      .eq("id", data.campaignId)
      .eq("user_id", context.userId)
      .single();
    if (!campaign?.email) return { ok: true };

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    await sendAppEmailSafe({
      templateName: "campaign-submitted",
      recipientEmail: campaign.email,
      templateData: {
        company: campaign.company,
        spotName: campaign.spot_name,
        startDate: fmtDate(campaign.start_date),
        endDate: fmtDate(campaign.end_date),
        dashboardUrl: "https://move-spot.com/annonceur",
      },
    });
    return { ok: true };
  });
