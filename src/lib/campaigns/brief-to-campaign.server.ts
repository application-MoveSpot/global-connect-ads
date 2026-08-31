import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Accepts a brief_proposal and creates the corresponding campaign_request so
 * the vehicle enters the active-campaign / GPS-tracking pipeline.
 * Also attempts a wallet settlement for individual advertisers.
 */
export const acceptBriefProposal = createServerFn({ method: "POST" })
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
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch brief + proposal (RLS ensures the advertiser owns the brief)
    const [briefRes, proposalRes, profileRes] = await Promise.all([
      supabase
        .from("advertiser_briefs")
        .select("id, title, start_date, end_date, days_count, advertiser_id")
        .eq("id", data.briefId)
        .maybeSingle(),
      supabase
        .from("brief_proposals")
        .select("id, vehicle_id, price_per_day, status")
        .eq("id", data.proposalId)
        .eq("brief_id", data.briefId)
        .maybeSingle(),
      supabase
        .from("advertiser_profiles")
        .select("full_name, account_type")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const brief = briefRes.data as {
      id: string; title: string; start_date: string; end_date: string;
      days_count: number | null; advertiser_id: string;
    } | null;
    const proposal = proposalRes.data as {
      id: string; vehicle_id: string; price_per_day: number; status: string;
    } | null;
    const profile = profileRes.data as { full_name?: string; account_type?: string } | null;

    if (!brief) throw new Error("Brief introuvable.");
    if (!proposal) throw new Error("Proposition introuvable.");

    // Idempotency: if already accepted, return existing campaign_request if any
    if (proposal.status === "accepted") {
      const { data: existing } = await supabaseAdmin
        .from("campaign_requests")
        .select("id, payment_status")
        .eq("vehicle_id", proposal.vehicle_id)
        .eq("start_date", brief.start_date)
        .eq("end_date", brief.end_date)
        .maybeSingle();
      if (existing) {
        const cr = existing as { id: string; payment_status: string };
        return { ok: true as const, campaignRequestId: cr.id, alreadyExists: true, settled: cr.payment_status === "paid", insufficientFunds: false };
      }
    }

    // Get advertiser email
    const authRes = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authRes.data?.user?.email ?? null;

    // Update proposal to accepted
    await supabaseAdmin
      .from("brief_proposals")
      .update({ status: "accepted" })
      .eq("id", data.proposalId);

    // Create campaign_request for this vehicle
    const totalPrice = Number(proposal.price_per_day) * (brief.days_count ?? 1);
    const companyValue = profile?.full_name ?? "Annonceur MoveSpot";
    const emailValue = email ?? `advertiser-${userId}@move-spot.com`;
    const { data: cr, error: crError } = await supabaseAdmin
      .from("campaign_requests")
      .insert({
        vehicle_id: proposal.vehicle_id,
        start_date: brief.start_date,
        end_date: brief.end_date,
        status: "approved",
        payment_status: "pending",
        total_price: totalPrice,
        spot_id: data.briefId, // brief acts as the "spot" in the brief flow
        spot_name: brief.title,
        company: companyValue,
        email: emailValue,
        message: `Via brief "${brief.title}"`,
        user_id: userId,
      })
      .select("id")
      .maybeSingle();

    if (crError) throw new Error(crError.message);
    if (!cr) throw new Error("Impossible de créer la campagne.");
    const campaignRequestId = (cr as { id: string }).id;

    // For individuals: attempt immediate wallet settlement
    const isIndividual = profile?.account_type === "individual";
    let settled = false;
    let insufficientFunds = false;

    if (isIndividual) {
      try {
        const { settleCampaignFromWallet } = await import(
          "@/lib/campaigns/campaign-settlement.server"
        );
        await settleCampaignFromWallet({
          campaignRequestId,
          description: `Campagne "${brief.title}" — ${brief.days_count ?? 0} jour(s)`,
        });
        settled = true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message.toLowerCase() : "";
        insufficientFunds =
          msg.includes("solde") || msg.includes("insuffisant") || msg.includes("fonds");
      }
    }

    return { ok: true as const, campaignRequestId, settled, insufficientFunds, alreadyExists: false };
  });
