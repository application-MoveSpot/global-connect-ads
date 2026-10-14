import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet, payCampaignWithWallet } from "@/lib/payments/wallet.functions";
import { captureError } from "@/lib/sentry";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { BankTransferPanel } from "@/components/advertiser/BankTransferPanel";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
  onPaid?: () => void;
};

export function CampaignPaymentCheckout({ campaignRequestId, totalPriceEur, onPaid }: Props) {
  const { t } = useTranslation();
  const fetchWallet = useServerFn(getMyWallet);
  const payWithWallet = useServerFn(payCampaignWithWallet);

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTopup, setPendingTopup] = useState(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const neededCents = Math.round(totalPriceEur * 100);

  const refreshBalance = async (): Promise<number> => {
    const w = await fetchWallet().catch(() => ({ balance_cents: 0 }));
    const cents = (w as { balance_cents: number }).balance_cents;
    setBalance(cents);
    return cents;
  };

  useEffect(() => {
    refreshBalance();
    return () => {
      if (realtimeChannelRef.current) {
        void supabase.removeChannel(realtimeChannelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPayWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      await payWithWallet({ data: { campaignRequestId } });
      onPaid?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("campaign_payment.err_generic"));
      captureError(e, "payment", { flow: "wallet_debit", campaignRequestId });
    } finally {
      setLoading(false);
    }
  };

  // Called when the topup dialog closes — subscribe to realtime until webhook credits wallet, then auto-pay.
  const onTopupClose = async () => {
    setChecking(true);
    setError(null);
    setPendingTopup(false);

    // Snapshot the current balance to detect the incoming credit.
    const before = await refreshBalance();
    if (before >= neededCents) {
      setChecking(false);
      await onPayWallet();
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) {
      setChecking(false);
      setPendingTopup(true);
      return;
    }

    // Fallback: if realtime doesn't fire within 60 s, show manual button.
    const fallbackTimer = setTimeout(() => {
      cleanupRealtime();
      setChecking(false);
      setPendingTopup(true);
    }, 60_000);

    const cleanupRealtime = () => {
      clearTimeout(fallbackTimer);
      if (realtimeChannelRef.current) {
        void supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };

    const channel = supabase
      .channel(`topup-await-${campaignRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const tx = payload.new as { kind: string; amount_cents: number };
          if (tx.kind !== "topup") return;
          cleanupRealtime();
          const cents = await refreshBalance();
          setChecking(false);
          if (cents >= neededCents) {
            await onPayWallet();
          } else {
            setPendingTopup(true);
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const onManualCheck = async () => {
    setChecking(true);
    setError(null);
    const cents = await refreshBalance();
    setChecking(false);
    if (cents >= neededCents) {
      setPendingTopup(false);
      await onPayWallet();
    }
  };

  const enough = balance !== null && balance >= neededCents;
  const missingEur = enough ? 0 : Math.max(10, Math.ceil((neededCents - (balance ?? 0)) / 100));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
        {t("campaign_payment.balance", {
          balance: ((balance ?? 0) / 100).toFixed(2),
          total: totalPriceEur.toFixed(2),
        })}
      </div>

      {checking ? (
        <p className="text-sm text-muted-foreground animate-pulse">
          {t("campaign_payment.checking")}
        </p>
      ) : enough ? (
        <Button onClick={onPayWallet} disabled={loading}>
          {loading
            ? t("campaign_payment.btn_paying")
            : t("campaign_payment.btn_pay", { amount: totalPriceEur.toFixed(2) })}
        </Button>
      ) : pendingTopup ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("campaign_payment.topup_received")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onManualCheck} disabled={loading}>
              {t("campaign_payment.btn_check_balance")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setPendingTopup(false)}
            >
              {t("campaign_payment.btn_topup_again")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("campaign_payment.balance_insufficient")}
          </p>
          <WalletTopupCheckout
            amountEuros={missingEur}
            disabled={loading}
            buttonLabel={t("campaign_payment.btn_topup_amount", { amount: missingEur })}
            onClose={onTopupClose}
          />
        </div>
      )}

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t("campaign_payment.bank_transfer_summary")}
        </summary>
        <div className="pt-4">
          <BankTransferPanel
            campaignRequestId={campaignRequestId}
            fixedAmountEuros={Math.max(10, Math.ceil(totalPriceEur))}
            title={t("campaign_payment.bank_transfer_title")}
            subtitle={t("campaign_payment.bank_transfer_subtitle")}
            onCredited={onPaid}
          />
        </div>
      </details>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
