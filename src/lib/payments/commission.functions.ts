import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CommissionTier = "particulier" | "pme" | "enterprise";

export type CommissionRate = {
  id: number;
  tier: CommissionTier;
  rate_bps: number;
  min_fee_cents: number;
  effective_from: string;
  notes: string | null;
  created_at: string;
};

export type MarginRow = {
  id: string;
  spot_name: string | null;
  paid_at: string | null;
  paid_amount_cents: number;
  platform_fee_cents: number;
  owner_amount_cents: number;
  stripe_fee_estimate_cents: number;
  net_margin_cents: number;
  effective_rate_bps: number;
  advertiser_tier: CommissionTier | null;
};

// ── Lecture des taux (admin) ──────────────────────────────────────────────────
export const getCommissionRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (
              c: string,
              opts: object,
            ) => Promise<{ data: CommissionRate[] | null; error: unknown }>;
          };
        };
      }
    )
      .from("commission_rates")
      .select("id, tier, rate_bps, min_fee_cents, effective_from, notes, created_at")
      .order("effective_from", { ascending: false });

    if (error) throw new Error("Impossible de lire les taux de commission");
    return { rates: (data ?? []) as CommissionRate[] };
  });

// ── Ajout d'un nouveau taux (admin) ──────────────────────────────────────────
const NewRateInput = z.object({
  tier: z.enum(["particulier", "pme", "enterprise"]),
  rate_bps: z.number().int().min(500).max(5000),
  min_fee_cents: z.number().int().min(0).max(5000),
  notes: z.string().max(500).optional(),
});

export const addCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof NewRateInput>) => NewRateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          insert: (d: object) => {
            select: (c: string) => {
              single: () => Promise<{ data: CommissionRate | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("commission_rates")
      .insert({
        tier: data.tier,
        rate_bps: data.rate_bps,
        min_fee_cents: data.min_fee_cents,
        notes: data.notes ?? null,
      })
      .select("id, tier, rate_bps, min_fee_cents, effective_from, notes, created_at")
      .single();

    if (error) throw new Error("Erreur lors de l'enregistrement du taux");
    return { rate: row as CommissionRate };
  });

// ── Stats de marge par campagne (admin) ──────────────────────────────────────
export const getCampaignMarginStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (
              c: string,
              opts: object,
            ) => {
              limit: (n: number) => Promise<{ data: MarginRow[] | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("campaign_margin_view")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(100);

    if (error) throw new Error("Impossible de lire les stats de marge");

    const rows = (data ?? []) as MarginRow[];

    // Aggrégats globaux
    const totalRevenueCents = rows.reduce((s, r) => s + r.paid_amount_cents, 0);
    const totalPlatformFeeCents = rows.reduce((s, r) => s + r.platform_fee_cents, 0);
    const totalNetMarginCents = rows.reduce((s, r) => s + r.net_margin_cents, 0);
    const totalStripeFeeCents = rows.reduce((s, r) => s + r.stripe_fee_estimate_cents, 0);

    // Alerte si la marge nette totale < coût fixe estimé (100 € / mois par défaut)
    // L'admin voit combien de campagnes ont généré une marge insuffisante
    const negativeMarginCount = rows.filter((r) => r.net_margin_cents < 0).length;

    return {
      rows,
      summary: {
        totalRevenueCents,
        totalPlatformFeeCents,
        totalNetMarginCents,
        totalStripeFeeCents,
        negativeMarginCount,
        campaignCount: rows.length,
      },
    };
  });
