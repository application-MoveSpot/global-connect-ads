/**
 * Logique commune aux deux endpoints webhook Stripe (api/public/stripe/webhook
 * et api/public/payments/webhook — historiquement dupliqués). Toute évolution
 * du traitement des événements Stripe se fait ici, une seule fois.
 */
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

async function syncProviderSubscription(
  supabaseAdmin: AdminClient,
  params: { userId?: string | null; subscriptionId: string; customerId: string | null; status: string; currentPeriodEnd?: number | null },
) {
  const patch = {
    stripe_subscription_id: params.subscriptionId,
    stripe_customer_id: params.customerId,
    stripe_subscription_status: params.status,
    stripe_subscription_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
  } as never;

  if (params.userId) {
    await supabaseAdmin.from("provider_profiles").update(patch).eq("user_id", params.userId);
    return;
  }
  await supabaseAdmin.from("provider_profiles").update(patch).eq("stripe_subscription_id", params.subscriptionId);
}

async function syncPartnerSubscription(
  supabaseAdmin: AdminClient,
  params: { userId?: string | null; subscriptionId: string; customerId: string | null; status: string; currentPeriodEnd?: number | null },
) {
  const patch = {
    stripe_subscription_id: params.subscriptionId,
    stripe_customer_id: params.customerId,
    stripe_subscription_status: params.status,
    stripe_subscription_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
  } as never;

  if (params.userId) {
    await supabaseAdmin.from("partner_profiles").update(patch).eq("user_id", params.userId);
    return;
  }
  await supabaseAdmin.from("partner_profiles").update(patch).eq("stripe_subscription_id" as never, params.subscriptionId);
}

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
  await supabaseAdmin.from("campaign_requests").update(patch).eq("stripe_subscription_id" as never, params.subscriptionId);
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

          // Email d'alerte sécurité — permet à l'utilisateur de détecter une recharge frauduleuse.
          try {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
            const email = userData.user?.email;
            if (email) {
              const now = new Date();
              const { sendAppEmailSafe } = await import("@/lib/email/send.server");
              await sendAppEmailSafe({
                templateName: "wallet-topup-alert",
                recipientEmail: email,
                idempotencyKey: `topup-alert-${s.id}`,
                templateData: {
                  amountEur: (amountCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
                  date: now.toLocaleDateString("fr-FR"),
                  time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                },
              });
            }
          } catch {
            // L'alerte email ne doit jamais bloquer le crédit du portefeuille.
          }
        }
      }

      if (s.metadata?.kind === "campaign_payment" && s.payment_status === "paid") {
        const campaignRequestId = s.metadata.campaign_request_id;
        if (campaignRequestId) {
          await supabaseAdmin
            .from("campaign_requests")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id:
                typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent as { id?: string } | null)?.id ?? null,
            } as never)
            .eq("id", campaignRequestId);
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

      if (s.metadata?.kind === "provider_subscription" && typeof s.subscription === "string") {
        await syncProviderSubscription(supabaseAdmin, {
          userId: s.metadata.user_id ?? null,
          subscriptionId: s.subscription,
          customerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
          status: s.status === "complete" ? "active" : "incomplete",
        });
      }

      if (s.metadata?.kind === "partner_subscription" && typeof s.subscription === "string") {
        await syncPartnerSubscription(supabaseAdmin, {
          userId: s.metadata.user_id ?? null,
          subscriptionId: s.subscription,
          customerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
          status: s.status === "complete" ? "active" : "incomplete",
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
      const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);

      if (sub.metadata?.kind === "provider_subscription") {
        await syncProviderSubscription(supabaseAdmin, {
          userId: sub.metadata?.user_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
        });
      } else if (sub.metadata?.kind === "partner_subscription") {
        await syncPartnerSubscription(supabaseAdmin, {
          userId: sub.metadata?.user_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
        });
      } else {
        await syncCampaignSubscription(supabaseAdmin, {
          campaignRequestId: sub.metadata?.campaign_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);

      if (sub.metadata?.kind === "provider_subscription") {
        await syncProviderSubscription(supabaseAdmin, {
          userId: sub.metadata?.user_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: "canceled",
        });
      } else if (sub.metadata?.kind === "partner_subscription") {
        await syncPartnerSubscription(supabaseAdmin, {
          userId: sub.metadata?.user_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: "canceled",
        });
      } else {
        await syncCampaignSubscription(supabaseAdmin, {
          campaignRequestId: sub.metadata?.campaign_id ?? null,
          subscriptionId: sub.id,
          customerId,
          status: "canceled",
        });
      }
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
          .eq("stripe_subscription_id" as never, subscriptionId);
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
          .eq("stripe_subscription_id" as never, subscriptionId);
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
      const pi = event.data.object as { id: string; last_payment_error?: { code?: string } };
      console.warn("[stripe] payment_intent.payment_failed", { id: pi.id, code: pi.last_payment_error?.code });
      break;
    }

    default:
      // ignore
      break;
  }
}
