import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = (Deno.env.get("MOVESPOT_STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY"))!;

interface ComputeRefundRequest {
  campaign_id: string;
  refund_request_id?: string;
  requested_amount_cents?: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: ComputeRefundRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { campaign_id, refund_request_id, requested_amount_cents } = body;
  if (!campaign_id) {
    return new Response("Missing campaign_id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaign_requests")
    .select(`
      id, user_id, pm_status, payment_status, start_date, end_date,
      paid_amount_cents, platform_fee_cents, owner_amount_cents,
      pose_fee_cents, depose_fee_cents, payout_status,
      stripe_payment_intent_id, stripe_transfer_id
    `)
    .eq("id", campaign_id)
    .single();

  if (campErr || !campaign) {
    return new Response(JSON.stringify({ error: "Campaign not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Compute refund amount based on campaign state and elapsed time
  const totalPaid = campaign.paid_amount_cents ?? 0;
  const platformFee = campaign.platform_fee_cents ?? 0;
  const ownerAmount = campaign.owner_amount_cents ?? 0;
  const poseFee = campaign.pose_fee_cents ?? 0;
  const deposeFee = campaign.depose_fee_cents ?? 0;

  let refundAmountCents = 0;
  let decision: "approved" | "partial" | "rejected" = "rejected";
  let reason = "";

  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  const now = new Date();

  // Refund logic by campaign state
  if (campaign.pm_status === "idle" || campaign.pm_status === "awaiting_installation") {
    // Campaign not yet started — full refund minus platform fee
    refundAmountCents = Math.max(0, totalPaid - platformFee);
    decision = refundAmountCents > 0 ? "approved" : "rejected";
    reason = "campaign_not_started";
  } else if (campaign.pm_status === "incident") {
    // Installation never happened — full refund minus platform fee
    refundAmountCents = Math.max(0, totalPaid - platformFee);
    decision = refundAmountCents > 0 ? "approved" : "rejected";
    reason = "installation_incident";
  } else if (campaign.pm_status === "active" && startDate && endDate) {
    // Partial refund: pro-rata for remaining days
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
    const remainingRatio = Math.max(0, (totalDays - elapsedDays) / totalDays);

    const advertisableAmount = Math.max(0, ownerAmount - poseFee - deposeFee);
    refundAmountCents = Math.floor(advertisableAmount * remainingRatio);

    if (refundAmountCents > 0) {
      decision = "partial";
      reason = `active_campaign_prorated_${elapsedDays}d_of_${totalDays}d`;
    } else {
      decision = "rejected";
      reason = "campaign_nearly_complete";
    }
  } else if (campaign.pm_status === "completing" || campaign.pm_status === "completed") {
    decision = "rejected";
    reason = "campaign_completed";
    refundAmountCents = 0;
  }

  // Cap at requested amount if provided
  if (requested_amount_cents && requested_amount_cents < refundAmountCents) {
    refundAmountCents = requested_amount_cents;
  }

  // Insert decision
  const { data: refundDecision } = await supabase
    .from("sv_refund_decisions")
    .insert({
      campaign_request_id: campaign_id,
      refund_request_id: refund_request_id ?? null,
      decision,
      refund_amount_cents: refundAmountCents,
      reason,
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  // Execute Stripe refund if approved/partial
  let stripeRefundId: string | null = null;

  if ((decision === "approved" || decision === "partial") && refundAmountCents > 0 && campaign.stripe_payment_intent_id) {
    try {
      const formData = new URLSearchParams({
        payment_intent: campaign.stripe_payment_intent_id,
        amount: String(refundAmountCents),
        reason: "requested_by_customer",
        "metadata[campaign_id]": campaign_id,
        "metadata[decision]": decision,
        "metadata[sv_decision_id]": refundDecision?.id ?? "",
      });

      const stripeRes = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const stripeData = await stripeRes.json();

      if (stripeRes.ok) {
        stripeRefundId = stripeData.id;

        // Update decision with refund ID
        if (refundDecision?.id) {
          await supabase
            .from("sv_refund_decisions")
            .update({
              stripe_refund_id: stripeRefundId,
              executed_at: new Date().toISOString(),
            })
            .eq("id", refundDecision.id);
        }

        // Update refund_request if exists
        if (refund_request_id) {
          await supabase
            .from("refund_requests")
            .update({
              stripe_refund_id: stripeRefundId,
              status: "refunded",
            })
            .eq("id", refund_request_id);
        }
      } else {
        console.error(`[sv-compute-refund] Stripe error: ${stripeData.error?.message}`);
      }
    } catch (e) {
      console.error(`[sv-compute-refund] Stripe exception: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Notify advertiser
  await supabase.from("notifications").insert({
    user_id: campaign.user_id,
    type: decision === "rejected" ? "refund_rejected" : "refund_processed",
    payload: {
      campaign_id,
      decision,
      refund_amount_cents: refundAmountCents,
      reason,
      stripe_refund_id: stripeRefundId,
    },
  }).throwOnError().catch(() => null);

  console.log(`[sv-compute-refund] campaign=${campaign_id} decision=${decision} amount=${refundAmountCents} stripe=${stripeRefundId ?? "none"}`);

  return new Response(
    JSON.stringify({
      ok: true,
      decision,
      refund_amount_cents: refundAmountCents,
      reason,
      stripe_refund_id: stripeRefundId,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
