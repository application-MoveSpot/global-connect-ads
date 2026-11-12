import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BankTransferStatus = "all" | "pending" | "processing" | "completed" | "failed";

export interface AdminBankTransferRow {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  reference: string;
  status: string;
  stripe_account_id: string | null;
  stripe_transfer_id: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminBankTransfers(statusFilter: BankTransferStatus = "all") {
  return useQuery({
    queryKey: ["admin-bank-transfers", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("bank_transfer_requests")
        .select(
          "id, user_id, amount_cents, currency, reference, status, stripe_account_id, stripe_transfer_id, failure_reason, admin_notes, created_at, updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminBankTransferRow[];
    },
    refetchInterval: 30000,
  });
}
