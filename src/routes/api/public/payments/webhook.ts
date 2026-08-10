import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook } from "@/lib/stripe.server";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let event: { id: string; type: string; data: { object: unknown } };
        try {
          event = await verifyWebhook(request);
        } catch (e) {
          return new Response(`Signature invalide: ${e instanceof Error ? e.message : "?"}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: seen } = await supabaseAdmin
          .from("stripe_events")
          .select("id")
          .eq("id", event.id)
          .maybeSingle();
        if (seen) return Response.json({ received: true, duplicate: true });
        await supabaseAdmin
          .from("stripe_events")
          .insert({ id: event.id, type: event.type, payload: event as never } as never);

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              if (s.metadata?.kind === "wallet_topup" && s.payment_status === "paid") {
                const userId = s.metadata.user_id;
                const amountCents = Number(s.metadata.amount_cents ?? s.amount_total ?? 0);
                if (userId && amountCents > 0) {
                  await supabaseAdmin.rpc("apply_wallet_transaction", {
                    p_user_id: userId,
                    p_kind: "topup",
                    p_amount_cents: amountCents,
                    p_description: "Recharge par carte bancaire",
                    p_stripe_checkout_session_id: s.id,
                    p_stripe_payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id,
                  });
                }
              }
              break;
            }
            case "account.updated": {
              const a = event.data.object as Stripe.Account;
              await supabaseAdmin
                .from("owner_profiles")
                .update({
                  stripe_charges_enabled: a.charges_enabled,
                  stripe_payouts_enabled: a.payouts_enabled,
                  stripe_details_submitted: a.details_submitted,
                  stripe_onboarding_completed_at: a.details_submitted ? new Date().toISOString() : null,
                } as never)
                .eq("stripe_account_id", a.id);
              break;
            }
            case "payment_intent.payment_failed": {
              console.warn("[stripe] payment_intent.payment_failed", event.data.object);
              break;
            }
            default:
              break;
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe webhook] handler error", e);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});