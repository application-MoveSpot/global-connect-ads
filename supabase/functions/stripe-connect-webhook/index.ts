import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
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

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Échec validation Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
