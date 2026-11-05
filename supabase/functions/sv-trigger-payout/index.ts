import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

type PayoutType = "owner_final" | "installer_pose" | "installer_depose" | "advertiser_refund";

interface TriggerPayoutRequest {
  campaign_id: string;
  payout_type: PayoutType;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: TriggerPayoutRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { campaign_id, payout_type } = body;
  if (!campaign_id || !payout_type) {
    return new Response("Missing campaign_id or payout_type", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Find pending payout in queue
  const { data: payout, error: payErr } = await supabase
    .from("sv_payout_queue")
    .select("*")
    .eq("campaign_request_id", campaign_id)
    .eq("payout_type", payout_type)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (payErr || !payout) {
    console.log(`[sv-trigger-payout] no pending payout for campaign=${campaign_id} type=${payout_type}`);
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve Stripe Connect account for recipient
  let stripeAccountId: string | null = payout.stripe_account_id;

  if (!stripeAccountId) {
    // Try owner_profiles first (for owner_final)
    const { data: ownerProfile } = await supabase
      .from("owner_profiles")
      .select("stripe_account_id, stripe_connect_account_id, stripe_charges_enabled")
      .eq("user_id", payout.recipient_user_id)
      .maybeSingle();

    if (ownerProfile?.stripe_account_id && ownerProfile.stripe_charges_enabled) {
      stripeAccountId = ownerProfile.stripe_account_id;
    } else if (ownerProfile?.stripe_connect_account_id) {
      stripeAccountId = ownerProfile.stripe_connect_account_id;
    }

    // Fallback: payee_profiles (for installers)
    if (!stripeAccountId) {
      const { data: payeeProfile } = await supabase
        .from("payee_profiles")
        .select("stripe_account_id, stripe_connect_account_id, stripe_charges_enabled")
        .eq("user_id", payout.recipient_user_id)
        .maybeSingle();

      if (payeeProfile?.stripe_account_id && payeeProfile.stripe_charges_enabled) {
        stripeAccountId = payeeProfile.stripe_account_id;
      } else if (payeeProfile?.stripe_connect_account_id) {
        stripeAccountId = payeeProfile.stripe_connect_account_id;
      }
    }
  }

  if (!stripeAccountId) {
    await supabase
      .from("sv_payout_queue")
      .update({
        status: "failed",
        error_message: "no_stripe_account",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    console.error(`[sv-trigger-payout] no stripe account for user=${payout.recipient_user_id}`);
    return new Response(
      JSON.stringify({ error: "no_stripe_account" }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mark as processing
  await supabase
    .from("sv_payout_queue")
    .update({ status: "processing" })
    .eq("id", payout.id);

  // Execute Stripe Transfer
  let transferId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const formData = new URLSearchParams({
      amount: String(payout.amount_cents),
      currency: payout.currency,
      destination: stripeAccountId,
      "metadata[campaign_id]": campaign_id,
      "metadata[payout_type]": payout_type,
      "metadata[sv_payout_id]": payout.id,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      throw new Error(stripeData.error?.message ?? "stripe_error");
    }

    transferId = stripeData.id;
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "unknown_error";
  }

  if (transferId) {
    // Update payout queue
    await supabase
      .from("sv_payout_queue")
      .update({
        status: "transferred",
        stripe_transfer_id: transferId,
        stripe_account_id: stripeAccountId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    // Update campaign_requests with transfer ID
    const campaignUpdate: Record<string, string> = {};
    if (payout_type === "owner_final") {
      campaignUpdate.payout_status = "transferred";
      campaignUpdate.stripe_transfer_id = transferId;
    } else if (payout_type === "installer_pose") {
      campaignUpdate.pose_payout_status = "transferred";
      campaignUpdate.pose_stripe_transfer_id = transferId;
    } else if (payout_type === "installer_depose") {
      campaignUpdate.depose_payout_status = "transferred";
      campaignUpdate.depose_stripe_transfer_id = transferId;
    }

    if (Object.keys(campaignUpdate).length > 0) {
      await supabase
        .from("campaign_requests")
        .update(campaignUpdate)
        .eq("id", campaign_id);
    }

    // Notify recipient
    await supabase.from("notifications").insert({
      user_id: payout.recipient_user_id,
      type: "payout_transferred",
      payload: { campaign_id, payout_type, amount_cents: payout.amount_cents, transfer_id: transferId },
    }).throwOnError().catch(() => null);

    console.log(`[sv-trigger-payout] campaign=${campaign_id} type=${payout_type} transfer=${transferId} amount=${payout.amount_cents}`);
  } else {
    const retryCount = (payout.retry_count ?? 0) + 1;
    await supabase
      .from("sv_payout_queue")
      .update({
        status: retryCount >= 3 ? "failed" : "pending",
        error_message: errorMessage,
        retry_count: retryCount,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    console.error(`[sv-trigger-payout] FAILED campaign=${campaign_id} type=${payout_type} error=${errorMessage} retry=${retryCount}`);
  }

  return new Response(
    JSON.stringify({ ok: !!transferId, transfer_id: transferId, error: errorMessage }),
    { headers: { "Content-Type": "application/json" } }
  );
});
