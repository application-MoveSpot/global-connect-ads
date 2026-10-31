import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WalletAnalytics = {
  burnRateEurPerDay: number;
  daysRemaining: number | null;
  recommendedTopupEur: number;
  topupReason: string;
  loading: boolean;
};

const PRESET_AMOUNTS_BUSINESS = [50, 100, 250, 500, 1000];

function snapToPreset(amount: number, isIndividual: boolean): number {
  const presets = isIndividual ? [49, 79, 149] : PRESET_AMOUNTS_BUSINESS;
  return presets.find((p) => p >= amount) ?? presets[presets.length - 1];
}

function daysToEndOfMonth(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function useWalletAnalytics(
  userId: string | null,
  balanceCents: number,
  isIndividual = false,
): WalletAnalytics {
  const [state, setState] = useState<WalletAnalytics>({
    burnRateEurPerDay: 0,
    daysRemaining: null,
    recommendedTopupEur: isIndividual ? 79 : 100,
    topupReason: "",
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const { data } = await supabase
          .from("wallet_transactions")
          .select("amount_cents")
          .eq("user_id", userId)
          .eq("kind", "campaign_debit")
          .gte("created_at", since);

        if (cancelled) return;

        const totalDebitCents = (data ?? []).reduce(
          (sum, tx) => sum + Math.abs(tx.amount_cents),
          0,
        );

        if (totalDebitCents === 0) {
          setState({ burnRateEurPerDay: 0, daysRemaining: null, recommendedTopupEur: isIndividual ? 79 : 100, topupReason: "", loading: false });
          return;
        }

        const burnRateEurPerDay = totalDebitCents / 100 / 30;
        const balanceEur = balanceCents / 100;
        const daysRemaining = Math.floor(balanceEur / burnRateEurPerDay);
        const remainingToEom = daysToEndOfMonth();
        const shortfall = burnRateEurPerDay * remainingToEom - balanceEur;
        const recommendedTopupEur =
          shortfall > 0 ? snapToPreset(Math.ceil(shortfall), isIndividual) : 0;

        const topupReason =
          recommendedTopupEur > 0
            ? `Rechargez ${recommendedTopupEur} € pour couvrir vos campagnes jusqu'à fin du mois (${remainingToEom} j restants).`
            : `Votre solde couvre vos campagnes jusqu'à fin du mois.`;

        if (!cancelled)
          setState({ burnRateEurPerDay, daysRemaining, recommendedTopupEur, topupReason, loading: false });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, balanceCents, isIndividual]);

  return state;
}
