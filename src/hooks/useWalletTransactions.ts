import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WalletTransactionKind =
  | "topup"
  | "campaign_payment"
  | "refund"
  | "debit"
  | "credit"
  | (string & {});

export interface WalletTransaction {
  id: string;
  amount_cents: number;
  /** Montant en euros (amount_cents / 100) */
  amount_eur: number;
  kind: WalletTransactionKind;
  description: string | null;
  created_at: string;
  wallet_id: string;
  campaign_request_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  currency: string;
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select(
          "id, amount_cents, kind, description, created_at, wallet_id, campaign_request_id, stripe_payment_intent_id, stripe_checkout_session_id, currency"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        amount_eur: row.amount_cents / 100,
      })) as WalletTransaction[];
    },
    staleTime: 30_000,
  });
}
