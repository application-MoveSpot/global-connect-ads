import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OwnerBankTransferRow {
  id: string;
  amount_cents: number;
  currency: string;
  reference: string;
  status: string;
  stripe_transfer_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useOwnerBankTransfers() {
  return useQuery({
    queryKey: ["owner-bank-transfers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await (supabase as any)
        .from("bank_transfer_requests")
        .select(
          "id, amount_cents, currency, reference, status, stripe_transfer_id, failure_reason, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as OwnerBankTransferRow[];
    },
    refetchInterval: 60000,
  });
}
