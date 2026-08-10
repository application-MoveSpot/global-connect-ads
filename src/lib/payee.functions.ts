import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PayeeKind = "driver" | "installer" | "both";
export type VehicleKind = "micro_mobility" | "voiture" | "utilitaire" | "walker";

export const VEHICLE_KIND_LABEL: Record<VehicleKind, string> = {
  micro_mobility: "Micro-mobilité (vélo, triporteur, scooter)",
  voiture: "Voiture",
  utilitaire: "Utilitaire / camion",
  walker: "Walker (sac à dos publicitaire)",
};

export type PayeeProfile = {
  id: string;
  kind: PayeeKind;
  full_name: string;
  phone: string | null;
  city: string | null;
  siret: string | null;
  status: string;
  vehicle_kind: VehicleKind | null;
  vehicle_plate: string | null;
  certification_status: string;
  certification_notes: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
};

const PROFILE_COLUMNS =
  "id, kind, full_name, phone, city, siret, status, vehicle_kind, vehicle_plate, certification_status, certification_notes, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted";

export const getPayeeProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ profile: PayeeProfile | null }> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("payee_profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    return { profile: (data as PayeeProfile | null) ?? null };
  });

export const getPayeeEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("payee_earnings")
      .select("id, amount_cents, currency, description, status, paid_at, created_at")
      .eq("payee_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = (data ?? []) as {
      id: string;
      amount_cents: number;
      currency: string;
      description: string | null;
      status: string;
      paid_at: string | null;
      created_at: string;
    }[];

    const totalCents = rows.reduce((s, r) => s + r.amount_cents, 0);
    const paidCents = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount_cents, 0);
    return { rows, totalCents, paidCents, pendingCents: totalCents - paidCents };
  });

const SignupInput = z.object({
  kind: z.enum(["driver", "installer", "both"]),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  vehicleKind: z.enum(["micro_mobility", "voiture", "utilitaire", "walker"]).optional().nullable(),
  vehiclePlate: z.string().max(20).optional().nullable(),
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
          vehicle_kind: data.vehicleKind ?? null,
          vehicle_plate: data.vehiclePlate ?? null,
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
