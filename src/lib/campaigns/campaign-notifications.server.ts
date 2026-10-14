import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Owner accepts or rejects a campaign request. Updates the DB and notifies the advertiser. */
export const respondToCampaignRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        campaignId: z.string().uuid(),
        response: z.enum(["accepted", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the owner owns a vehicle linked to this request before allowing the update
    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        "id, user_id, email, company, spot_name, start_date, end_date, total_price, vehicle_id",
      )
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) return { ok: false, error: "not_found" };

    // Confirm the requesting owner actually owns the vehicle on this campaign
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", campaign.vehicle_id as string)
      .maybeSingle();
    if (!vehicle) return { ok: false, error: "forbidden" };

    const { error: upErr } = await supabaseAdmin
      .from("campaign_requests")
      .update({ owner_response: data.response })
      .eq("id", data.campaignId);
    if (upErr) return { ok: false, error: upErr.message };

    // Fire email + push notifications to the advertiser (fire & forget)
    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
    const accepted = data.response === "accepted";

    if (campaign.email) {
      const { sendAppEmailSafe } = await import("@/lib/email/send.server");
      void sendAppEmailSafe({
        templateName: "campaign-owner-response",
        recipientEmail: campaign.email as string,
        idempotencyKey: `owner-response-${data.campaignId}-${data.response}`,
        templateData: {
          company: campaign.company,
          spotName: campaign.spot_name,
          startDate: fmtDate(campaign.start_date as string | null),
          endDate: fmtDate(campaign.end_date as string | null),
          totalPrice: campaign.total_price ? `${campaign.total_price} €` : undefined,
          accepted,
          dashboardUrl: "https://move-spot.com/annonceur",
        },
      });
    }

    if (campaign.user_id) {
      const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
      void sendWebPushToUser(campaign.user_id as string, {
        title: accepted
          ? "Un propriétaire a accepté votre demande ✅"
          : "ℹ️ Réponse d'un propriétaire",
        body: campaign.spot_name
          ? accepted
            ? `Votre campagne « ${campaign.spot_name} » a été acceptée.`
            : `Un propriétaire n'est pas disponible pour « ${campaign.spot_name} ».`
          : undefined,
        url: "/annonceur",
      });
    }

    return { ok: true };
  });

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
      supabase.from("advertiser_profiles").select("full_name").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    const brief = briefRes.data;
    const email = authRes.data?.user?.email;
    if (!brief || !email) return { ok: true };

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
    const types = brief.vehicle_types as string[] | null;
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
