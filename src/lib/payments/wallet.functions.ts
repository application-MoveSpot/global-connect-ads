import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSentryCapture } from "@/lib/sentry.server";

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
      .select("id, kind, amount_cents, currency, description, created_at, campaign_request_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      balance_cents: wallet?.balance_cents ?? 0,
      currency: wallet?.currency ?? "eur",
      transactions: txs ?? [],
    };
  });

// ----- Read transactions with filter + pagination -----
const TxQuerySchema = z.object({
  kind: z.enum(["all", "topup", "campaign_debit", "refund", "admin_adjustment"]).default("all"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(500).default(25),
});

export const getWalletTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => TxQuerySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;

    const base = supabase
      .from("wallet_transactions")
      .select("id, kind, amount_cents, currency, description, created_at, campaign_request_id", {
        count: "exact",
      })
      .eq("user_id", userId);

    const filtered = data.kind !== "all" ? base.eq("kind", data.kind) : base;
    const {
      data: txs,
      count,
      error,
    } = await filtered.order("created_at", { ascending: false }).range(from, to);

    if (error) throw new Error(error.message);
    return { transactions: txs ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

// ----- Admin: trigger a wallet-credit refund -----
const RefundInput = z.object({
  campaignRequestId: z.string().uuid(),
  amountEuros: z.number().positive(),
  reason: z.string().min(3).max(500),
});

export const issueCampaignRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof RefundInput>) => RefundInput.parse(d))
  .handler(({ data, context }) =>
    withSentryCapture(
      async () => {
        const { supabase, userId: callerId } = context;
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: callerId,
          _role: "admin",
        });
        if (!isAdmin) throw new Error("Admin requis");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: campaign, error: cErr } = await supabaseAdmin
          .from("campaign_requests")
          .select("id, user_id, total_price")
          .eq("id", data.campaignRequestId)
          .single();
        if (cErr || !campaign) throw new Error("Campagne introuvable");
        if (!campaign.user_id) throw new Error("Campagne sans annonceur identifié");

        const amountCents = Math.round(data.amountEuros * 100);

        const { data: refundRow, error: rErr } = await supabaseAdmin
          .from("refunds")
          .insert({
            campaign_request_id: campaign.id,
            user_id: campaign.user_id,
            amount_cents: amountCents,
            currency: "eur",
            reason: data.reason,
            channel: "wallet_credit",
            status: "pending",
          } as never)
          .select("id")
          .single();
        if (rErr || !refundRow) throw new Error(rErr?.message ?? "Création remboursement échouée");

        const { error: rpcError } = await supabaseAdmin.rpc("apply_wallet_transaction", {
          p_user_id: campaign.user_id,
          p_kind: "refund",
          p_amount_cents: amountCents,
          p_description: `Remboursement — ${data.reason}`,
          p_campaign_request_id: campaign.id,
        });
        if (rpcError) {
          await supabaseAdmin
            .from("refunds")
            .update({ status: "failed", notes: rpcError.message } as never)
            .eq("id", refundRow.id);
          throw new Error(`Crédit du portefeuille échoué : ${rpcError.message}`);
        }
        await supabaseAdmin
          .from("refunds")
          .update({ status: "succeeded" } as never)
          .eq("id", refundRow.id);

        return { ok: true, refundId: refundRow.id };
      },
      "payment",
      { userId: context.userId },
    ),
  );

// ----- Advertiser: pay an approved campaign with prepaid wallet credits -----
const PayInput = z.object({ campaignRequestId: z.string().uuid() });

export const payCampaignWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof PayInput>) => PayInput.parse(d))
  .handler(({ data, context }) =>
    withSentryCapture(
      async () => {
        const { supabase, userId } = context;
        const { data: campaign, error } = await supabase
          .from("campaign_requests")
          .select("id, user_id, total_price, status, payment_status, spot_name")
          .eq("id", data.campaignRequestId)
          .maybeSingle();
        if (error || !campaign) throw new Error("Campagne introuvable");
        if (campaign.user_id !== userId) throw new Error("Accès refusé");
        if (campaign.status !== "approved")
          throw new Error("La campagne doit être validée avant le paiement");
        if (campaign.payment_status === "paid") return { ok: true, alreadyPaid: true };
        if (!campaign.total_price || Number(campaign.total_price) <= 0)
          throw new Error("Montant invalide");

        const { settleCampaignFromWallet } =
          await import("@/lib/campaigns/campaign-settlement.server");
        return settleCampaignFromWallet({ campaignRequestId: campaign.id });
      },
      "payment",
      { userId: context.userId },
    ),
  );
