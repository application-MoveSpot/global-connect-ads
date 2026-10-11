import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://move-spot.com";

/**
 * Notifies the advertiser that a new proposal arrived on their brief.
 * Called client-side by the owner immediately after inserting into brief_proposals.
 */
export const sendBriefProposalReceivedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        briefId: z.string().uuid(),
        proposalId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [briefRes, proposalRes] = await Promise.all([
      supabaseAdmin
        .from("advertiser_briefs")
        .select("id, title, start_date, end_date, zones, advertiser_id")
        .eq("id", data.briefId)
        .maybeSingle(),
      supabaseAdmin
        .from("brief_proposals")
        .select("id, vehicle_id, owner_id, price_per_day")
        .eq("id", data.proposalId)
        .maybeSingle(),
    ]);

    const brief = briefRes.data as {
      id: string; title: string; start_date: string; end_date: string;
      zones: string[] | null; advertiser_id: string;
    } | null;
    const proposal = proposalRes.data as {
      id: string; vehicle_id: string; owner_id: string; price_per_day: number;
    } | null;

    if (!brief || !proposal) return { sent: false, reason: "not_found" };

    const [advertiserProfileRes, ownerProfileRes] = await Promise.all([
      supabaseAdmin
        .from("advertiser_profiles")
        .select("full_name, company, user_id")
        .eq("id", brief.advertiser_id)
        .maybeSingle(),
      supabaseAdmin
        .from("owner_profiles")
        .select("full_name")
        .eq("id", proposal.owner_id)
        .maybeSingle(),
    ]);

    const advertiserProfile = advertiserProfileRes.data as {
      full_name?: string; company?: string; user_id: string;
    } | null;

    if (!advertiserProfile?.user_id) return { sent: false, reason: "no_advertiser" };

    const authRes = await supabaseAdmin.auth.admin.getUserById(advertiserProfile.user_id);
    const email = authRes.data?.user?.email;
    if (!email) return { sent: false, reason: "no_email" };

    const ownerProfile = ownerProfileRes.data as { full_name?: string } | null;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    const zone = (brief.zones ?? []).join(", ") || undefined;
    const companyName = advertiserProfile.company ?? advertiserProfile.full_name;

    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    return sendAppEmailSafe({
      templateName: "brief-proposal-received",
      recipientEmail: email,
      idempotencyKey: `brief-proposal-received-${proposal.id}`,
      templateData: {
        company: companyName,
        spotName: brief.title,
        ownerName: ownerProfile?.full_name,
        proposedPrice: `${Number(proposal.price_per_day).toFixed(2)} €/jour`,
        zone,
        startDate: fmtDate(brief.start_date),
        endDate: fmtDate(brief.end_date),
        dashboardUrl: `${BASE_URL}/annonceur/briefs/${brief.id}`,
      },
    });
  });

/**
 * Rejects a brief proposal and notifies the owner by email.
 * Replaces the client-side direct update in advertiser.briefs.$briefId.tsx.
 */
export const rejectBriefProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        proposalId: z.string().uuid(),
        briefId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // RLS: advertiser owns the brief, so this update is safe via user supabase client
    await supabase.from("brief_proposals").update({ status: "rejected" }).eq("id", data.proposalId);

    // Fetch data needed for the email
    const [proposalRes, briefRes] = await Promise.all([
      supabaseAdmin
        .from("brief_proposals")
        .select("owner_id")
        .eq("id", data.proposalId)
        .maybeSingle(),
      supabaseAdmin
        .from("advertiser_briefs")
        .select("title, advertiser_id")
        .eq("id", data.briefId)
        .maybeSingle(),
    ]);

    const proposal = proposalRes.data as { owner_id: string } | null;
    const brief = briefRes.data as { title: string; advertiser_id: string } | null;
    if (!proposal || !brief) return { ok: true };

    const [ownerProfileRes, advertiserProfileRes] = await Promise.all([
      supabaseAdmin
        .from("owner_profiles")
        .select("full_name, user_id")
        .eq("id", proposal.owner_id)
        .maybeSingle(),
      supabaseAdmin
        .from("advertiser_profiles")
        .select("company, full_name")
        .eq("id", brief.advertiser_id)
        .maybeSingle(),
    ]);

    const ownerProfile = ownerProfileRes.data as { full_name?: string; user_id: string } | null;
    const advertiserProfile = advertiserProfileRes.data as { company?: string; full_name?: string } | null;
    if (!ownerProfile?.user_id) return { ok: true };

    const ownerAuthRes = await supabaseAdmin.auth.admin.getUserById(ownerProfile.user_id);
    const ownerEmail = ownerAuthRes.data?.user?.email;
    if (!ownerEmail) return { ok: true };

    try {
      const { sendAppEmailSafe } = await import("@/lib/email/send.server");
      await sendAppEmailSafe({
        templateName: "brief-proposal-rejected",
        recipientEmail: ownerEmail,
        idempotencyKey: `brief-proposal-rejected-${data.proposalId}`,
        templateData: {
          ownerName: ownerProfile.full_name,
          briefTitle: brief.title,
          company: advertiserProfile?.company ?? advertiserProfile?.full_name,
          dashboardUrl: `${BASE_URL}/proprietaire/briefs`,
        },
      });
    } catch { /* non-critical */ }

    return { ok: true };
  });
