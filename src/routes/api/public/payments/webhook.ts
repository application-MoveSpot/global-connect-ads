import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

async function handleWalletTopup(session: Record<string, unknown>, metadata: Record<string, string>) {
  const userId = metadata.userId;
  const amountCents = Number(metadata.amount_cents);
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) return;
  if (session.payment_status !== "paid") return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
  const sessionId = typeof session.id === "string" ? session.id : undefined;

  await supabaseAdmin.rpc("apply_wallet_transaction", {
    p_user_id: userId,
    p_kind: "topup",
    p_amount_cents: amountCents,
    p_description: `Recharge portefeuille — ${(amountCents / 100).toFixed(2)} €`,
    p_stripe_payment_intent_id: piId,
    p_stripe_checkout_session_id: sessionId,
  });
}

async function handleCampaignPayment(session: Record<string, unknown>, metadata: Record<string, string>) {
  const campaignId = metadata.campaign_request_id;
  if (!campaignId) return;
  if (session.payment_status !== "paid") return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  await supabaseAdmin
    .from("campaign_requests")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: piId,
    })
    .eq("id", campaignId);
}

async function handleAccountUpdated(account: Record<string, unknown>) {
  const accountId = typeof account.id === "string" ? account.id : null;
  if (!accountId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;
  const detailsSubmitted = !!account.details_submitted;
  await supabaseAdmin
    .from("owner_profiles")
    .update({
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
      stripe_onboarding_completed_at: detailsSubmitted && payoutsEnabled ? new Date().toISOString() : null,
    })
    .eq("stripe_connect_account_id", accountId);
}

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (metadata.kind === "wallet_topup") return handleWalletTopup(session, metadata);
  if (metadata.kind === "campaign_payment") return handleCampaignPayment(session, metadata);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutCompleted(event.data.object);
              break;
            case "account.updated":
              await handleAccountUpdated(event.data.object);
              break;
            default:
              break;
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
