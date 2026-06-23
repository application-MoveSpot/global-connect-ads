import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

// MoveSpot conserve au moins 30 % sur chaque campagne payée.
export const PLATFORM_COMMISSION_RATE = 0.3;

const EnvIn = z.enum(["sandbox", "live"]);

// ---------- PROPRIÉTAIRE — Stripe Connect Express ----------

const ConnectOnboardInput = z.object({
  returnUrl: z.string().url(),
  refreshUrl: z.string().url(),
  environment: EnvIn,
});

type OnboardResult = { url: string } | { error: string };

export const createOwnerConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ConnectOnboardInput>) => ConnectOnboardInput.parse(d))
  .handler(async ({ data, context }): Promise<OnboardResult> => {
    try {
      const { supabase, userId } = context;
      const { data: profile } = await supabase
        .from("owner_profiles")
        .select("id, stripe_connect_account_id, full_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile) return { error: "Profil propriétaire introuvable." };
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? undefined;

      const stripe = createStripeClient(data.environment as StripeEnv);
      let accountId = profile.stripe_connect_account_id;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "FR",
          email,

          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: "individual",
          metadata: { userId, ownerProfileId: profile.id },
        });
        accountId = account.id;
        await supabase
          .from("owner_profiles")
          .update({ stripe_connect_account_id: accountId })
          .eq("id", profile.id);
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: data.refreshUrl,
        return_url: data.returnUrl,
        type: "account_onboarding",
      });

      return { url: link.url };
    } catch (error) {
      console.error("createOwnerConnectOnboarding error", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

export const refreshOwnerConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: "sandbox" | "live" }) => EnvIn.parse(d.environment) && d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("owner_profiles")
      .select("id, stripe_connect_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile?.stripe_connect_account_id) {
      return { connected: false, charges_enabled: false, payouts_enabled: false };
    }
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
      const completed = account.details_submitted && account.payouts_enabled;
      await supabase
        .from("owner_profiles")
        .update({
          stripe_charges_enabled: !!account.charges_enabled,
          stripe_payouts_enabled: !!account.payouts_enabled,
          stripe_onboarding_completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", profile.id);
      return {
        connected: true,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
      };
    } catch (error) {
      console.error("refreshOwnerConnectStatus", error);
      return { connected: true, charges_enabled: false, payouts_enabled: false };
    }
  });

// ---------- ANNONCEUR — paiement campagne ----------

const CampaignCheckoutInput = z.object({
  campaignRequestId: z.string().uuid(),
  returnUrl: z.string().url(),
  environment: EnvIn,
});

type CheckoutResult = { clientSecret: string } | { error: string };

export const createCampaignCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CampaignCheckoutInput>) => CampaignCheckoutInput.parse(d))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;

      const { data: campaign, error: cErr } = await supabase
        .from("campaign_requests")
        .select("id, user_id, vehicle_id, total_price, days_count, status, payment_status, spot_name")
        .eq("id", data.campaignRequestId)
        .maybeSingle();
      if (cErr || !campaign) return { error: "Campagne introuvable." };
      if (campaign.user_id !== userId) return { error: "Accès refusé." };
      if (campaign.status !== "approved") return { error: "La campagne n'est pas approuvée." };
      if (campaign.payment_status === "paid") return { error: "Déjà payée." };
      if (!campaign.total_price || campaign.total_price <= 0) return { error: "Montant invalide." };

      const amountCents = Math.round(Number(campaign.total_price) * 100);
      const platformFeeCents = Math.max(
        Math.round(amountCents * PLATFORM_COMMISSION_RATE),
        Math.ceil(amountCents * PLATFORM_COMMISSION_RATE),
      );
      const ownerAmountCents = amountCents - platformFeeCents;

      const stripe = createStripeClient(data.environment as StripeEnv);

      // Customer keyed by userId
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? undefined;
      let customerId: string | undefined;
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data.length) customerId = found.data[0].id;
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(email && { email }),
          metadata: { userId },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        customer_update: { address: "auto", name: "auto" },
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `Campagne MoveSpot — ${campaign.spot_name ?? "véhicule"}`,
              description: `${campaign.days_count ?? 1} jour(s) de diffusion`,
              tax_code: "txcd_20030000", // Advertising services
            },
            unit_amount: amountCents,
            tax_behavior: "exclusive",
          },
          quantity: 1,
        }],
        managed_payments: { enabled: true },
        payment_intent_data: {
          description: `Campagne MoveSpot ${campaign.id}`,
          metadata: {
            kind: "campaign_payment",
            campaign_request_id: campaign.id,
            userId,
          },
        },
        metadata: {
          kind: "campaign_payment",
          campaign_request_id: campaign.id,
          userId,
          platform_fee_cents: String(platformFeeCents),
          owner_amount_cents: String(ownerAmountCents),
          managed_payments: "true",
        },
      } as import("stripe").Stripe.Checkout.SessionCreateParams);


      await supabase
        .from("campaign_requests")
        .update({
          stripe_checkout_session_id: session.id,
          platform_fee_cents: platformFeeCents,
          owner_amount_cents: ownerAmountCents,
          payment_status: "pending",
        })
        .eq("id", campaign.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createCampaignCheckout", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---------- ADMIN — reversement fin de campagne ----------

const TransferInput = z.object({
  campaignRequestId: z.string().uuid(),
  environment: EnvIn,
});

type TransferResult = { ok: true; transferId: string } | { error: string };

export const transferCampaignPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof TransferInput>) => TransferInput.parse(d))
  .handler(async ({ data, context }): Promise<TransferResult> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { error: "Réservé aux administrateurs." };

    const { data: c } = await supabase
      .from("campaign_requests")
      .select("id, vehicle_id, owner_amount_cents, payment_status, payout_status, end_date, stripe_payment_intent_id")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (!c) return { error: "Campagne introuvable." };
    if (c.payment_status !== "paid") return { error: "Campagne non payée." };
    if (c.payout_status === "transferred") return { error: "Déjà reversée." };
    if (!c.owner_amount_cents || c.owner_amount_cents <= 0) return { error: "Montant à reverser invalide." };
    if (c.end_date && new Date(c.end_date) > new Date()) {
      return { error: "La campagne n'est pas terminée." };
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("owner_id")
      .eq("id", c.vehicle_id!)
      .maybeSingle();
    if (!vehicle) return { error: "Véhicule introuvable." };

    const { data: owner } = await supabase
      .from("owner_profiles")
      .select("stripe_connect_account_id, stripe_payouts_enabled")
      .eq("id", vehicle.owner_id)
      .maybeSingle();
    if (!owner?.stripe_connect_account_id || !owner.stripe_payouts_enabled) {
      return { error: "Le propriétaire n'a pas activé ses paiements Stripe." };
    }

    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const transfer = await stripe.transfers.create({
        amount: Number(c.owner_amount_cents),
        currency: "eur",
        destination: owner.stripe_connect_account_id,
        description: `Reversement campagne ${c.id}`,
        metadata: { campaign_request_id: c.id },
        ...(c.stripe_payment_intent_id ? { transfer_group: c.stripe_payment_intent_id } : {}),
      });
      await supabase
        .from("campaign_requests")
        .update({
          payout_status: "transferred",
          stripe_transfer_id: transfer.id,
          payout_transferred_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      return { ok: true, transferId: transfer.id };
    } catch (error) {
      console.error("transferCampaignPayout", error);
      return { error: getStripeErrorMessage(error) };
    }
  });
