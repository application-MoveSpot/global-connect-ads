import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ================== ADVERTISER — Wallet top-up via Stripe Checkout ==================
const TopupInput = z.object({
  amountEuros: z.number().min(10).max(50000),
  returnUrl: z.string().url(),
});

export const createWalletTopupCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof TopupInput>) => TopupInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const amountCents = Math.round(data.amountEuros * 100);

    const { data: userRow } = await supabase.auth.getUser();
    const email = userRow.user?.email ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: "Recharge portefeuille MoveSpot" },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      customer_email: email,
      success_url: `${data.returnUrl}?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.returnUrl}?topup=cancel`,
      metadata: {
        kind: "wallet_topup",
        user_id: userId,
        amount_cents: String(amountCents),
      },
      payment_intent_data: {
        metadata: {
          kind: "wallet_topup",
          user_id: userId,
          amount_cents: String(amountCents),
        },
      },
    });

    return { url: session.url, id: session.id };
  });

// ================== OWNER — Stripe Connect Express onboarding ==================
const OnboardingInput = z.object({ returnUrl: z.string().url() });

export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof OnboardingInput>) => OnboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: profile, error } = await supabase
      .from("owner_profiles")
      .select("id, stripe_account_id, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !profile) throw new Error("Profil propriétaire introuvable");

    let accountId = profile.stripe_account_id;
    if (!accountId) {
      const { data: userRow } = await supabase.auth.getUser();
      const email = userRow.user?.email ?? undefined;
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { user_id: userId, owner_profile_id: profile.id },
      });
      accountId = account.id;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("owner_profiles")
        .update({ stripe_account_id: accountId } as never)
        .eq("id", profile.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: data.returnUrl,
      return_url: data.returnUrl,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

export const getConnectAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("owner_profiles")
      .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      return { connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false };
    }

    // Refresh live status from Stripe
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    try {
      const acc = await stripe.accounts.retrieve(profile.stripe_account_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("owner_profiles")
        .update({
          stripe_charges_enabled: acc.charges_enabled,
          stripe_payouts_enabled: acc.payouts_enabled,
          stripe_details_submitted: acc.details_submitted,
          stripe_onboarding_completed_at: acc.details_submitted ? new Date().toISOString() : null,
        } as never)
        .eq("user_id", userId);
      return {
        connected: true,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        details_submitted: acc.details_submitted,
      };
    } catch {
      return {
        connected: true,
        charges_enabled: profile.stripe_charges_enabled,
        payouts_enabled: profile.stripe_payouts_enabled,
        details_submitted: profile.stripe_details_submitted,
      };
    }
  });

// ================== ADMIN — Transfer 70% to owner Connect account ==================
const TransferInput = z.object({ campaignRequestId: z.string().uuid() });

export const transferToOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof TransferInput>) => TransferInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, vehicle_id, owner_amount_cents, payment_status, payout_status, stripe_transfer_id, spot_name")
      .eq("id", data.campaignRequestId)
      .single();
    if (error || !campaign) throw new Error("Campagne introuvable");
    if (campaign.payment_status !== "paid") throw new Error("Campagne non payée");
    if (campaign.payout_status === "transferred" || campaign.stripe_transfer_id) {
      return { ok: true, alreadyDone: true };
    }
    if (!campaign.owner_amount_cents || campaign.owner_amount_cents <= 0) throw new Error("Montant à reverser invalide");
    if (!campaign.vehicle_id) throw new Error("Véhicule introuvable");

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("owner_id")
      .eq("id", campaign.vehicle_id)
      .single();
    if (!vehicle?.owner_id) throw new Error("Propriétaire introuvable");

    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", vehicle.owner_id)
      .single();
    if (!owner?.stripe_account_id) throw new Error("Le propriétaire n'a pas connecté son compte Stripe");
    if (!owner.stripe_payouts_enabled) throw new Error("Le compte Stripe du propriétaire n'est pas encore actif");

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: campaign.owner_amount_cents,
      currency: "eur",
      destination: owner.stripe_account_id,
      description: `Reversement campagne — ${campaign.spot_name}`,
      metadata: { campaign_request_id: campaign.id },
    });

    await supabaseAdmin
      .from("campaign_requests")
      .update({
        stripe_transfer_id: transfer.id,
        payout_status: "transferred",
        owner_transferred_at: new Date().toISOString(),
      } as never)
      .eq("id", campaign.id);

    return { ok: true, transferId: transfer.id };
  });
