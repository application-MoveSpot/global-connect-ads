import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Inscription / profil ──────────────────────────────────────────────────────

export const createCommercialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fullName: z.string().min(2).max(100),
        phone: z.string().optional(),
        company: z.string().optional(),
        city: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabase
      .from("commercial_profiles" as never)
      .select("id")
      .eq("user_id" as never, userId)
      .maybeSingle();
    if (existing)
      return { ok: false as const, error: "Un profil commercial existe déjà pour ce compte." };

    // Générer un code parrainage unique
    const base = data.fullName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const referralCode = `${base}${suffix}`;

    const { data: row, error } = await (supabaseAdmin as any)
      .from("commercial_profiles")
      .insert([
        {
          user_id: userId,
          full_name: data.fullName.trim(),
          phone: data.phone?.trim() || null,
          company: data.company?.trim() || null,
          city: data.city?.trim() || null,
          referral_code: referralCode,
        },
      ])
      .select("id, referral_code")
      .single();

    if (error) return { ok: false as const, error: (error as { message: string }).message };
    return {
      ok: true as const,
      id: (row as { id: string }).id,
      referralCode: (row as { referral_code: string }).referral_code,
    };
  });

// ── Tableau de bord commercial ────────────────────────────────────────────────

export const getCommercialDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await (supabase as any)
      .from("commercial_profiles")
      .select("id, full_name, referral_code, commission_rate, active, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr || !profile) return { ok: false as const, error: "Profil commercial introuvable." };

    // Clients apportés
    const { data: clients } = await (supabase as any)
      .from("advertiser_profiles")
      .select("id, full_name, company, created_at")
      .eq("commercial_id", profile.id)
      .order("created_at", { ascending: false });

    // Campagnes liées aux clients
    const clientIds = (clients ?? []).map((c: { id: string }) => c.id);
    let campaigns: CommercialCampaign[] = [];
    if (clientIds.length > 0) {
      const { data: camps } = await (supabase as any)
        .from("campaign_requests")
        .select(
          "id, company, spot_name, total_price, commission_amount_cents, commission_paid_at, status, created_at, commercial_id",
        )
        .eq("commercial_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200);
      campaigns = (camps ?? []) as CommercialCampaign[];
    }

    const totalCommissionCents = campaigns.reduce(
      (s: number, c) => s + (c.commission_amount_cents ?? 0),
      0,
    );
    const paidCommissionCents = campaigns
      .filter((c) => c.commission_paid_at)
      .reduce((s: number, c) => s + (c.commission_amount_cents ?? 0), 0);

    return {
      ok: true as const,
      profile: profile as CommercialProfile,
      clients: (clients ?? []) as CommercialClient[],
      campaigns,
      totalCommissionCents,
      paidCommissionCents,
    };
  });

// ── Résoudre un code parrainage (côté inscription annonceur) ──────────────────
// Public: called before the user is authenticated, so no auth middleware.

export const resolveReferralCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: commercial } = await (supabaseAdmin as any)
      .from("commercial_profiles")
      .select("id, full_name, referral_code")
      .eq("referral_code", data.code.trim().toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (!commercial) return { ok: false as const };
    return { ok: true as const, commercialId: commercial.id, name: commercial.full_name };
  });

// ── Admin : liste des commerciaux ────────────────────────────────────────────

export const listCommercialsForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role" as never, {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin as any)
      .from("commercial_profiles")
      .select("id, full_name, company, city, referral_code, commission_rate, active, created_at")
      .order("created_at", { ascending: false });

    if (error) return { ok: false as const, commercials: [] };
    return { ok: true as const, commercials: (data ?? []) as CommercialProfile[] };
  });

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommercialProfile = {
  id: string;
  full_name: string;
  company: string | null;
  city: string | null;
  referral_code: string;
  commission_rate: number;
  active: boolean;
  created_at: string;
};

export type CommercialClient = {
  id: string;
  full_name: string;
  company: string | null;
  created_at: string;
};

export type CommercialCampaign = {
  id: string;
  company: string;
  spot_name: string;
  total_price: number | null;
  commission_amount_cents: number | null;
  commission_paid_at: string | null;
  status: string;
  created_at: string;
  commercial_id: string | null;
};
