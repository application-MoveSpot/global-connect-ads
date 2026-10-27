import { createFileRoute } from "@tanstack/react-router";
import { verifyCinetPayTransaction } from "@/lib/payments/cinetpay.server";
import { captureServerException } from "@/lib/sentry.server";

export const Route = createFileRoute("/api/public/cinetpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: Record<string, string>;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const transactionId = body.cpm_trans_id as string | undefined;
        if (!transactionId) {
          return new Response("Missing cpm_trans_id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: check if already processed
        const idempotencyKey = `cinetpay:${transactionId}`;
        const { data: existing } = await supabaseAdmin
          .from("wallet_transactions")
          .select("id")
          .eq("stripe_payment_intent_id", idempotencyKey)
          .maybeSingle();
        if (existing) {
          return Response.json({ received: true, duplicate: true });
        }

        try {
          const tx = await verifyCinetPayTransaction(transactionId);

          if (tx.status !== "ACCEPTED") {
            // Payment not completed — acknowledge without crediting
            return Response.json({ received: true, status: tx.status });
          }

          // Parse custom data set at checkout creation
          const customData = tx.customData ? JSON.parse(tx.customData) : null;
          const userId: string | undefined = customData?.user_id;
          const amountXof: number | undefined = customData?.amount_xof;

          if (!userId || !amountXof) {
            return new Response("Missing user_id or amount_xof in metadata", { status: 422 });
          }

          // Credit wallet — amount_xof is used as amount_cents (XOF has no sub-unit)
          const { error: rpcError } = await supabaseAdmin.rpc("apply_wallet_transaction", {
            p_user_id: userId,
            p_kind: "topup",
            p_amount_cents: amountXof,
            p_description: "Recharge via Mobile Money (CinetPay)",
            p_stripe_checkout_session_id: undefined,
            p_stripe_payment_intent_id: idempotencyKey,
          });

          if (rpcError) {
            captureServerException(new Error(rpcError.message), {
              category: "payment",
              userId,
              extra: { transactionId },
            });
            return new Response("Wallet credit failed", { status: 500 });
          }

          return Response.json({ received: true });
        } catch (error) {
          captureServerException(error, { category: "payment", extra: { transactionId } });
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
