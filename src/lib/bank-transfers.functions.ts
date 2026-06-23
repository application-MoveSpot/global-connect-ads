import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Bank account info (server-only) ----
export const getCompanyBankAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      holder: process.env.CA_ACCOUNT_HOLDER ?? "MoveSpot",
      iban: process.env.CA_IBAN ?? "",
      bic: process.env.CA_BIC ?? "",
      bank_name: "Crédit Agricole",
    };
  });

// ---- Create a wallet top-up bank transfer request ----
const TopupInput = z.object({
  amountEuros: z.number().min(50).max(50000),
});

export const createWalletTopupTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof TopupInput>) => TopupInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const amountCents = Math.round(data.amountEuros * 100);

    const { data: refRow, error: refErr } = await supabase.rpc("generate_transfer_reference");
    if (refErr || !refRow) throw new Error("Génération référence échouée");
    const reference = refRow as unknown as string;

    const { data: inserted, error } = await supabase
      .from("bank_transfer_requests")
      .insert({
        user_id: userId,
        reference,
        amount_cents: amountCents,
        purpose: "wallet_topup",
        status: "pending",
      } as never)
      .select("id, reference, amount_cents, expires_at, created_at")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Création demande échouée");
    return inserted;
  });

// ---- Create a direct campaign bank transfer ----
const CampaignTransferInput = z.object({
  campaignRequestId: z.string().uuid(),
});

export const createCampaignTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CampaignTransferInput>) => CampaignTransferInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: c, error } = await supabase
      .from("campaign_requests")
      .select("id, user_id, total_price, status, payment_status")
      .eq("id", data.campaignRequestId)
      .maybeSingle();
    if (error || !c) throw new Error("Campagne introuvable");
    if (c.user_id !== userId) throw new Error("Accès refusé");
    if (c.status !== "approved") throw new Error("Campagne non validée");
    if (c.payment_status === "paid") throw new Error("Campagne déjà payée");
    if (!c.total_price) throw new Error("Montant invalide");

    const amountCents = Math.round(Number(c.total_price) * 100);

    // Reuse pending request if exists
    const { data: existing } = await supabase
      .from("bank_transfer_requests")
      .select("id, reference, amount_cents, expires_at, created_at")
      .eq("user_id", userId)
      .eq("campaign_request_id", data.campaignRequestId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return existing;

    const { data: refRow, error: refErr } = await supabase.rpc("generate_transfer_reference");
    if (refErr || !refRow) throw new Error("Génération référence échouée");

    const { data: inserted, error: iErr } = await supabase
      .from("bank_transfer_requests")
      .insert({
        user_id: userId,
        reference: refRow as unknown as string,
        amount_cents: amountCents,
        purpose: "campaign_direct",
        campaign_request_id: data.campaignRequestId,
        status: "pending",
      } as never)
      .select("id, reference, amount_cents, expires_at, created_at")
      .single();
    if (iErr || !inserted) throw new Error(iErr?.message ?? "Création demande échouée");
    return inserted;
  });

// ---- List my pending transfers ----
export const listMyTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("bank_transfer_requests")
      .select("id, reference, amount_cents, status, purpose, campaign_request_id, expires_at, created_at, received_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

// ---- Cancel one of my pending transfers ----
const CancelInput = z.object({ id: z.string().uuid() });
export const cancelMyTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CancelInput>) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("bank_transfer_requests")
      .update({ status: "cancelled" } as never)
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- ADMIN: list pending transfers ----
export const listPendingTransfersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: requests } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id, reference, amount_cents, status, purpose, user_id, campaign_request_id, created_at, expires_at, received_at, admin_notes")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!requests || requests.length === 0) return { transfers: [] };
    const userIds = Array.from(new Set(requests.map((r) => r.user_id)));
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userMap = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const { data: profiles } = await supabaseAdmin
      .from("advertiser_profiles")
      .select("user_id, full_name, company")
      .in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return {
      transfers: requests.map((r) => ({
        ...r,
        amount_euros: r.amount_cents / 100,
        user_email: userMap.get(r.user_id) ?? "",
        user_name: profileMap.get(r.user_id)?.full_name ?? profileMap.get(r.user_id)?.company ?? "",
      })),
    };
  });

// ---- ADMIN: confirm a transfer as received ----
const ConfirmInput = z.object({
  id: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});
export const confirmTransferAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ConfirmInput>) => ConfirmInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("confirm_bank_transfer", {
      p_request_id: data.id,
      p_admin_notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { id: result };
  });
