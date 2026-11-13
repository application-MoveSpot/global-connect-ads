import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2026-03-25.dahlia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe Signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );

    console.log(`Webhook Stripe reçu : ${event.type} [${event.id}]`);

    // ── account.updated : sync Stripe Connect status ──────────────────────────
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;

      const stripeAccountId  = account.id;
      const payoutsEnabled   = account.payouts_enabled ?? false;
      const requirementsDue  = account.requirements?.currently_due ?? [];

      console.log(
        `Compte Connect ${stripeAccountId} : payouts_enabled = ${payoutsEnabled}`,
      );

      const { error } = await supabase
        .from("owner_profiles")
        .update({
          stripe_payouts_enabled:  payoutsEnabled,
          stripe_requirements_due: requirementsDue,
          updated_at:              new Date().toISOString(),
        })
        .eq("stripe_connect_account_id", stripeAccountId);

      if (error) {
        console.error(
          `Erreur update owner_profiles pour ${stripeAccountId}:`,
          error.message,
        );
        return new Response(`DB Error: ${error.message}`, { status: 500 });
      }

      console.log(`Profil synchronisé pour ${stripeAccountId}`);
    }

    // ── transfer.reversed : virement annulé par Stripe ───────────────────────
    if (event.type === "transfer.reversed") {
      const transfer = event.data.object as Stripe.Transfer;
      const transferId = transfer.id;
      const reversalReason =
        (transfer.reversals?.data?.[0] as any)?.reason ?? "unknown";
      const failureReason = `transfer_reversed: ${reversalReason}`;

      console.log(`Transfer ${transferId} reversé (${reversalReason})`);

      const { error } = await supabase
        .from("bank_transfer_requests")
        .update({
          status:         "failed",
          failure_reason: failureReason,
          updated_at:     new Date().toISOString(),
        })
        .eq("stripe_transfer_id", transferId);

      if (error) {
        console.error(
          `Erreur update bank_transfer_requests pour transfer ${transferId}:`,
          error.message,
        );
        return new Response(`DB Error: ${error.message}`, { status: 500 });
      }

      console.log(
        `bank_transfer_requests mis en failed pour transfer ${transferId}`,
      );
    }

    // ── payout.failed : versement bancaire final échoué ───────────────────────
    // event.account = Connect account ID (disponible sur les webhooks Connect)
    if (event.type === "payout.failed") {
      const payout = event.data.object as Stripe.Payout;
      const connectAccountId = (event as any).account as string | undefined;
      const failCode    = payout.failure_code ?? "unknown_failure";
      const failMessage = payout.failure_message ?? "payout_failed";
      const failureReason = `payout_failed: ${failCode} — ${failMessage}`;

      console.log(
        `Payout ${payout.id} échoué pour ${connectAccountId ?? "unknown"}: ${failCode}`,
      );

      if (connectAccountId) {
        // On marque en failed toutes les lignes completed pour ce compte
        // dont le payout_id correspond (ou les plus récentes si pas d'ID payout stocké)
        const { error } = await supabase
          .from("bank_transfer_requests")
          .update({
            status:         "failed",
            failure_reason: failureReason,
            updated_at:     new Date().toISOString(),
          })
          .eq("stripe_account_id", connectAccountId)
          .eq("status", "completed");

        if (error) {
          console.error(
            `Erreur update bank_transfer_requests pour payout ${payout.id}:`,
            error.message,
          );
          return new Response(`DB Error: ${error.message}`, { status: 500 });
        }

        console.log(
          `bank_transfer_requests mis en failed pour payout échoué (${connectAccountId})`,
        );
      } else {
        console.warn(
          `payout.failed reçu sans event.account — impossible de matcher bank_transfer_requests`,
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Échec validation Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
