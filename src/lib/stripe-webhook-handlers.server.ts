/**
 * Logique commune aux deux endpoints webhook Stripe (api/public/stripe/webhook
 * et api/public/payments/webhook — historiquement dupliqués). Toute évolution
 * du traitement des événements Stripe se fait ici, une seule fois.
 */
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

async function syncCampaignSubscription(
  supabaseAdmin: AdminClient,
  params: {
    campaignRequestId?: string | null;
    subscriptionId: string;
    customerId: string | null;
    status: string;
    currentPeriodEnd?: number | null;
  },
) {
  const patch = {
    stripe_subscription_id: params.subscriptionId,
    subscription_customer_id: params.customerId,
    subscription_status: params.status,
    subscription_current_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
  } as never;

  if (params.campaignRequestId) {
    await supabaseAdmin.from("campaign_requests").update(patch).eq("id", params.campaignRequestId);
    return;
  }
  // Pas de campagne connue dans les metadata de l'événement (ex. subscription.updated
  // reçu avant le checkout.session.completed) : on retrouve la ligne par l'ID Stripe déjà posé.
  await supabaseAdmin.from("campaign_requests").update(patch).eq("stripe_subscription_id", params.subscriptionId);
}

export async function handleStripeEvent(
  event: { id: string; type: string; data: { object: unknown } },
  supabaseAdmin: AdminClient,
): Promise<void> {
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

      if (s.metadata?.kind === "campaign_subscription" && typeof s.subscription === "string") {
        await syncCampaignSubscription(supabaseAdmin, {
          campaignRequestId: s.metadata.campaign_id ?? null,
          subscriptionId: s.subscription,
          customerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
          // Le statut définitif (trialing/active) arrive via customer.subscription.*,
          // mais on pose déjà une valeur pour ne pas laisser la ligne vide en cas de délai.
          status: s.status === "complete" ? "active" : "incomplete",
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncCampaignSubscription(supabaseAdmin, {
        campaignRequestId: sub.metadata?.campaign_id ?? null,
        subscriptionId: sub.id,
        customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
        status: sub.status,
        currentPeriodEnd: (sub as unknown as { current_period_end?: number }).current_period_end ?? null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncCampaignSubscription(supabaseAdmin, {
        campaignRequestId: sub.metadata?.campaign_id ?? null,
        subscriptionId: sub.id,
        customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
        status: "canceled",
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
          ? (invoice as unknown as { subscription: string }).subscription
          : (invoice as unknown as { subscription?: { id: string } }).subscription?.id;
      if (subscriptionId) {
        await supabaseAdmin
          .from("campaign_requests")
          .update({ subscription_status: "active" } as never)
          .eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
          ? (invoice as unknown as { subscription: string }).subscription
          : (invoice as unknown as { subscription?: { id: string } }).subscription?.id;
      if (subscriptionId) {
        await supabaseAdmin
          .from("campaign_requests")
          .update({ subscription_status: "past_due" } as never)
          .eq("stripe_subscription_id", subscriptionId);
      }
      console.warn("[stripe] invoice.payment_failed", subscriptionId ?? invoice.id);
      break;
    }

    case "account.updated": {
      const a = event.data.object as Stripe.Account;
      const fullyEnabled = Boolean(a.charges_enabled && a.payouts_enabled);
      const patch = {
        stripe_charges_enabled: Boolean(a.charges_enabled),
        stripe_payouts_enabled: Boolean(a.payouts_enabled),
        stripe_details_submitted: Boolean(a.details_submitted),
        stripe_onboarding_completed_at: fullyEnabled ? new Date().toISOString() : null,
      } as never;

      // Propriétaires de véhicules
      await supabaseAdmin.from("owner_profiles").update(patch).eq("stripe_account_id", a.id);
      await supabaseAdmin.from("owner_profiles").update(patch).eq("stripe_connect_account_id", a.id);

      // Chauffeurs / poseurs (payees)
      await supabaseAdmin.from("payee_profiles").update(patch).eq("stripe_account_id", a.id);
      await supabaseAdmin.from("payee_profiles").update(patch).eq("stripe_connect_account_id", a.id);

      console.info("[stripe] account.updated", a.id, { fullyEnabled });
      break;
    }

    case "payment_intent.payment_failed": {
      console.warn("[stripe] payment_intent.payment_failed", event.data.object);
      break;
    }

    default:
      // ignore
      break;
  }
}
