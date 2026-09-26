import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Annonceur : soumettre une demande ─────────────────────────────────────────

export const submitRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignRequestId: z.string().uuid().optional(),
      amountCents: z.number().int().positive().optional(),
      reason: z.string().min(20).max(1000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Vérifier que la campagne appartient bien à cet utilisateur
    if (data.campaignRequestId) {
      const { data: camp } = await supabase
        .from("campaign_requests")
        .select("id, payment_status")
        .eq("id", data.campaignRequestId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!camp) return { ok: false as const, error: "Campagne introuvable." };
      if (camp.payment_status !== "paid") return { ok: false as const, error: "Seules les campagnes payées sont éligibles au remboursement." };
    }

    const { data: row, error } = await supabaseAdmin
      .from("refund_requests" as never)
      .insert([{
        user_id: userId,
        campaign_request_id: data.campaignRequestId ?? null,
        amount_cents: data.amountCents ?? null,
        reason: data.reason.trim(),
      }] as never)
      .select("id")
      .single();

    if (error) return { ok: false as const, error: (error as { message: string }).message };
    return { ok: true as const, id: (row as { id: string }).id };
  });

// ── Annonceur : lister ses demandes ──────────────────────────────────────────

export const listMyRefundRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("refund_requests" as never)
      .select("id, campaign_request_id, amount_cents, reason, status, admin_notes, created_at" as never)
      .eq("user_id" as never, userId)
      .order("created_at" as never, { ascending: false });

    if (error) return { ok: false as const, requests: [] };
    return { ok: true as const, requests: (data ?? []) as RefundRequest[] };
  });

// ── Admin : lister toutes les demandes ───────────────────────────────────────

export const listRefundRequestsForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ status: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = (supabaseAdmin as any)
      .from("refund_requests")
      .select("id, user_id, campaign_request_id, amount_cents, reason, status, admin_notes, stripe_refund_id, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status && data.status !== "all") q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) return { ok: false as const, requests: [] };
    return { ok: true as const, requests: (rows ?? []) as AdminRefundRequest[] };
  });

// ── Admin : traiter une demande ───────────────────────────────────────────────

export const reviewRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["approved", "rejected", "processed"]),
      adminNotes: z.string().max(500).optional(),
      stripeRefundId: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any)
      .from("refund_requests")
      .update({
        status: data.status,
        admin_notes: data.adminNotes ?? null,
        stripe_refund_id: data.stripeRefundId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) return { ok: false as const, error: (error as { message: string }).message };
    return { ok: true as const };
  });

// ── Types partagés ────────────────────────────────────────────────────────────

export type RefundRequest = {
  id: string;
  campaign_request_id: string | null;
  amount_cents: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  admin_notes: string | null;
  created_at: string;
};

export type AdminRefundRequest = RefundRequest & {
  user_id: string;
  stripe_refund_id: string | null;
  updated_at: string;
};
