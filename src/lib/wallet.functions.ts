import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

// ----- Read current wallet & history (authenticated user) -----
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_cents, currency, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: txs } = await supabase
      .from("wallet_transactions")
      .select("id, kind, amount_cents, currency, description, created_at, campaign_request_id, stripe_payment_intent_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      balance_cents: wallet?.balance_cents ?? 0,
      currency: wallet?.currency ?? "eur",
      transactions: txs ?? [],
    };
  });

// ----- Create a Stripe Embedded Checkout to top-up wallet -----
const TopupInput = z.object({
  amountEuros: z.number().min(10).max(5000),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

type TopupResult = { clientSecret: string } | { error: string };

export const createWalletTopupCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof TopupInput>) => TopupInput.parse(d))
  .handler(async ({ data, context }): Promise<TopupResult> => {
    try {
      const { userId, supabase } = context;
      const stripe = createStripeClient(data.environment as StripeEnv);

      const { data: profile } = await supabase
        .from("advertiser_profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? undefined;

      // Resolve or create Stripe customer keyed by userId
      let customerId: string | undefined;
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data.length) {
        customerId = found.data[0].id;
      } else if (email) {
        const list = await stripe.customers.list({ email, limit: 1 });
        if (list.data.length) {
          customerId = list.data[0].id;
          await stripe.customers.update(customerId, {
            metadata: { ...list.data[0].metadata, userId },
          });
        }
      }
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(email && { email }),
          ...(profile?.full_name && { name: profile.full_name }),
          metadata: { userId },
        });
        customerId = created.id;
      }

      const amountCents = Math.round(data.amountEuros * 100);
      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: "Recharge portefeuille MoveSpot",
              description: "Crédits prépayés utilisables pour vos campagnes publicitaires.",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: {
          description: `Recharge portefeuille — ${data.amountEuros} €`,
          metadata: { userId, kind: "wallet_topup", amount_cents: String(amountCents) },
        },
        metadata: { userId, kind: "wallet_topup", amount_cents: String(amountCents) },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ----- Admin: trigger a refund (wallet credit or Stripe refund) -----
const RefundInput = z.object({
  campaignRequestId: z.string().uuid(),
  amountEuros: z.number().positive(),
  reason: z.string().min(3).max(500),
  channel: z.enum(["wallet_credit", "stripe_refund"]),
  environment: z.enum(["sandbox", "live"]),
});

export const issueCampaignRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof RefundInput>) => RefundInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, user_id, total_price")
      .eq("id", data.campaignRequestId)
      .single();
    if (cErr || !campaign) throw new Error("Campagne introuvable");
    if (!campaign.user_id) throw new Error("Campagne sans annonceur identifié");
    const campaignUserId = campaign.user_id;

    const amountCents = Math.round(data.amountEuros * 100);

    // Insert refund row (pending)
    const { data: refundRow, error: rErr } = await supabaseAdmin
      .from("refunds")
      .insert({
        campaign_request_id: campaign.id,
        user_id: campaignUserId,
        amount_cents: amountCents,
        currency: "eur",
        reason: data.reason,
        channel: data.channel,
        status: "pending",
      } as never)
      .select("id")
      .single();
    if (rErr || !refundRow) throw new Error(rErr?.message ?? "Création remboursement échouée");

    try {
      if (data.channel === "wallet_credit") {
        await supabaseAdmin.rpc("apply_wallet_transaction", {
          p_user_id: campaignUserId,
          p_kind: "refund",
          p_amount_cents: amountCents,
          p_description: `Remboursement campagne — ${data.reason}`,
          p_campaign_request_id: campaign.id,
        });
        await supabaseAdmin.from("refunds").update({ status: "succeeded" }).eq("id", refundRow.id);
      } else {
        // Stripe refund: find original payment
        const stripe = createStripeClient(data.environment as StripeEnv);
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${campaignUserId}'`,
          limit: 1,
        });
        if (!found.data.length) throw new Error("Aucun client Stripe trouvé");
        const charges = await stripe.charges.list({ customer: found.data[0].id, limit: 20 });
        const charge = charges.data.find((c) => c.paid && !c.refunded && c.amount >= amountCents);
        if (!charge) throw new Error("Aucun paiement Stripe remboursable trouvé");
        const refund = await stripe.refunds.create({ charge: charge.id, amount: amountCents });
        await supabaseAdmin.from("refunds").update({
          status: refund.status === "succeeded" ? "succeeded" : "pending",
          stripe_refund_id: refund.id,
        }).eq("id", refundRow.id);
      }
      return { ok: true, refundId: refundRow.id };
    } catch (error) {
      await supabaseAdmin.from("refunds").update({
        status: "failed",
        notes: getStripeErrorMessage(error),
      }).eq("id", refundRow.id);
      throw new Error(getStripeErrorMessage(error));
    }
  });

// ----- Advertiser: pay an approved campaign with prepaid wallet credits -----
const PayInput = z.object({ campaignRequestId: z.string().uuid() });

export const payCampaignWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof PayInput>) => PayInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: campaign, error } = await supabase
      .from("campaign_requests")
      .select("id, user_id, total_price, status, payment_status, spot_name")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (error || !campaign) throw new Error("Campagne introuvable");
    if (campaign.user_id !== userId) throw new Error("Accès refusé");
    if (campaign.status !== "approved") throw new Error("La campagne doit être validée avant le paiement");
    if (campaign.payment_status === "paid") return { ok: true, alreadyPaid: true };
    if (!campaign.total_price || Number(campaign.total_price) <= 0) throw new Error("Montant invalide");

    const amountCents = Math.round(Number(campaign.total_price) * 100);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Debit (negative amount). RPC raises if balance insufficient.
    await supabaseAdmin.rpc("apply_wallet_transaction", {
      p_user_id: userId,
      p_kind: "campaign_debit",
      p_amount_cents: -amountCents,
      p_description: `Paiement campagne — ${campaign.spot_name}`,
      p_campaign_request_id: campaign.id,
    });

    await supabaseAdmin
      .from("campaign_requests")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount_cents: amountCents,
      })
      .eq("id", campaign.id);

    return { ok: true, amountCents };
  });
