import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BankDetails = {
  accountHolder: string;
  iban: string;
  bic: string;
};

/** Coordonnées bancaires MoveSpot (RIB) — réservées aux utilisateurs connectés. */
export const getBankDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BankDetails> => ({
    accountHolder: process.env["CA_ACCOUNT_HOLDER"] ?? "MoveSpot",
    iban: process.env["CA_IBAN"] ?? "",
    bic: process.env["CA_BIC"] ?? "",
  }));

const CreateInput = z.object({
  amountEuros: z.number().min(10).max(200000),
  campaignRequestId: z.string().uuid().optional(),
});

export const createBankTransferRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CreateInput>) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reference = `MS-${Date.now().toString(36).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}`;

    const { data: row, error } = await supabase
      .from("bank_transfer_requests")
      .insert({
        user_id: userId,
        amount_cents: Math.round(data.amountEuros * 100),
        reference,
        campaign_request_id: data.campaignRequestId ?? null,
      } as never)
      .select("id, reference, amount_cents, status, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

const ReceiptInput = z.object({
  requestId: z.string().uuid(),
  receiptPath: z.string().min(3).max(500),
});

export const attachBankTransferReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ReceiptInput>) => ReceiptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.receiptPath.startsWith(`${userId}/`)) throw new Error("Chemin de fichier invalide");

    const { error } = await supabase
      .from("bank_transfer_requests")
      .update({ receipt_path: data.receiptPath, status: "submitted" } as never)
      .eq("id", data.requestId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyBankTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("bank_transfer_requests")
      .select(
        "id, reference, amount_cents, status, receipt_path, admin_notes, created_at, campaign_request_id",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// ================== ADMIN ==================
export const listBankTransfersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id, user_id, reference, amount_cents, status, receipt_path, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = data ?? [];
    const withUrls = await Promise.all(
      rows.map(async (row) => {
        if (!row.receipt_path) return { ...row, receipt_url: null as string | null };
        const { data: signed } = await supabaseAdmin.storage
          .from("bank-receipts")
          .createSignedUrl(row.receipt_path, 3600);
        return { ...row, receipt_url: signed?.signedUrl ?? null };
      }),
    );
    return withUrls;
  });

const ReviewInput = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export const reviewBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ReviewInput>) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id, user_id, amount_cents, status, reference")
      .eq("id", data.requestId)
      .single();
    if (error || !row) throw new Error("Demande introuvable");
    if (row.status === "approved") return { ok: true, alreadyDone: true };

    if (data.approve) {
      const { error: rpcError } = await supabaseAdmin.rpc("apply_wallet_transaction", {
        p_user_id: row.user_id,
        p_kind: "topup",
        p_amount_cents: row.amount_cents,
        p_description: `Virement bancaire validé — réf. ${row.reference}`,
      });
      if (rpcError) throw new Error(rpcError.message);
    }

    await supabaseAdmin
      .from("bank_transfer_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        admin_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);

    return { ok: true };
  });
