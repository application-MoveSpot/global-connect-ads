import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (metadata.kind !== "wallet_topup") return;
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
