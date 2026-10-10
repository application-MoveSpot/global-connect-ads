import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { captureError } from "@/lib/sentry";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createCampaignDirectPaymentCheckout } from "@/lib/payments/payments.functions";
import { getPaymentsConfig, getStripe } from "@/lib/payments/stripe";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  campaignRequestId: string;
  campaignName?: string;
  totalPriceEur: number;
  onPaid?: () => void;
};

export function CampaignPaymentCheckout({ campaignRequestId, campaignName, totalPriceEur, onPaid }: Props) {
  const { t } = useTranslation();
  const createCheckout = useServerFn(createCampaignDirectPaymentCheckout);
  const [open, setOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createCheckout({
        data: {
          campaignRequestId,
          campaignName,
          amountEuros: totalPriceEur,
          returnUrl: window.location.href,
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error(t("wallet_topup.err_no_session"));
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("wallet_topup.err_stripe");
      setError(message);
      captureError(e, "payment", { flow: "campaign_direct_payment", campaignRequestId });
      throw e;
    }
  }, [campaignRequestId, campaignName, totalPriceEur, createCheckout, t]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const showCheckout = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError(t("wallet_topup.err_not_configured"));
      setOpen(true);
      return;
    }
    setCheckoutKey((k) => k + 1);
    setOpen(true);
  };

  const cleanupRealtime = () => {
    if (realtimeRef.current) {
      void supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
  };

  const onClose = async () => {
    setOpen(false);
    setChecking(true);

    const fallback = setTimeout(() => {
      cleanupRealtime();
      setChecking(false);
    }, 60_000);

    const channel = supabase
      .channel(`campaign-payment-${campaignRequestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_requests", filter: `id=eq.${campaignRequestId}` },
        (payload) => {
          const row = payload.new as { payment_status?: string };
          if (row.payment_status === "paid") {
            clearTimeout(fallback);
            cleanupRealtime();
            setChecking(false);
            onPaid?.();
          }
        },
      )
      .subscribe();

    realtimeRef.current = channel;
  };

  return (
    <>
      <Button
        onClick={showCheckout}
        disabled={totalPriceEur <= 0}
        className="rounded-full px-4 py-2 text-sm font-semibold"
      >
        {t("campaign_payment.btn_pay_stripe", { amount: totalPriceEur.toFixed(2) })}
      </Button>

      {checking && (
        <p className="text-xs text-muted-foreground animate-pulse mt-1">
          {t("campaign_payment.checking")}
        </p>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) void onClose(); else setOpen(true); }}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>{t("campaign_payment.dialog_title")}</DialogTitle>
              <DialogDescription>
                {t("campaign_payment.dialog_desc", { amount: totalPriceEur.toFixed(2) })}
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!error ? (
              <div key={checkoutKey} className="min-h-[560px]">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
