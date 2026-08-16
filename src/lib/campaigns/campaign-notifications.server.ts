import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const notifyCampaignSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select("spot_name, company, email, start_date, end_date")
      .eq("id", data.campaignId)
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
