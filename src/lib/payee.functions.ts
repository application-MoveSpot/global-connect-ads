import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PayeeKind = "driver" | "installer" | "both";

export type PayeeProfile = {
  id: string;
  kind: PayeeKind;
  full_name: string;
  phone: string | null;
  city: string | null;
  siret: string | null;
  status: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
};

export const getPayeeProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ profile: PayeeProfile | null }> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("payee_profiles")
      .select(
        "id, kind, full_name, phone, city, siret, status, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
      )
      .eq("user_id", userId)
      .maybeSingle();
    return { profile: (data as PayeeProfile | null) ?? null };
  });

const SignupInput = z.object({
  kind: z.enum(["driver", "installer", "both"]),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
});

export const createPayeeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SignupInput>) => SignupInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("payee_profiles")
      .upsert(
        {
          user_id: userId,
          kind: data.kind,
          full_name: data.fullName,
          phone: data.phone ?? null,
          city: data.city ?? null,
          siret: data.siret ?? null,
        } as never,
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

// ================== Stripe Connect Express (chauffeurs / poseurs) ==================
const OnboardingInput = z.object({ returnUrl: z.string().url() });

export const createPayeeOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof OnboardingInput>) => OnboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { createStripeClient, getDefaultStripeEnvironment } = await import("./stripe.server");
    const stripe = createStripeClient(getDefaultStripeEnvironment());

    const { data: profile, error } = await supabase
      .from("payee_profiles")
      .select("id, stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !profile) throw new Error("Fiche chauffeur/poseur introuvable — complétez d'abord votre inscription.");

    let accountId = (profile as { stripe_account_id: string | null }).stripe_account_id;
    if (!accountId) {
      const { data: userRow } = await supabase.auth.getUser();
      const email = userRow.user?.email ?? undefined;
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        ...(email && { email }),
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        metadata: { user_id: userId, payee_profile_id: (profile as { id: string }).id, role: "payee" },
      });
      accountId = account.id;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("payee_profiles")
        .update({ stripe_account_id: accountId } as never)
        .eq("user_id", userId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: data.returnUrl,
      return_url: data.returnUrl,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

export const getPayeeConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("payee_profiles")
      .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted")
      .eq("user_id", userId)
      .maybeSingle();

    const row = profile as {
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean;
      stripe_payouts_enabled: boolean;
      stripe_details_submitted: boolean;
    } | null;

    if (!row?.stripe_account_id) {
      return { connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false };
    }

    const { createStripeClient, getDefaultStripeEnvironment } = await import("./stripe.server");
    const stripe = createStripeClient(getDefaultStripeEnvironment());
    try {
      const acc = await stripe.accounts.retrieve(row.stripe_account_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("payee_profiles")
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
        charges_enabled: row.stripe_charges_enabled,
        payouts_enabled: row.stripe_payouts_enabled,
        details_submitted: row.stripe_details_submitted,
      };
    }
  });
