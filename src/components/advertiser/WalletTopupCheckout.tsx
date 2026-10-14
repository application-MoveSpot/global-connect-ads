import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { captureError } from "@/lib/sentry";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createWalletTopupCheckout } from "@/lib/payments/payments.functions";
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

type Props = {
  amountEuros: number;
  returnUrl?: string;
  buttonLabel?: string;
  disabled?: boolean;
  className?: string;
  campaignBriefId?: string | null;
  onClose?: () => void;
};

export function WalletTopupCheckout({
  amountEuros,
  returnUrl,
  buttonLabel,
  disabled,
  className,
  campaignBriefId,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const createTopup = useServerFn(createWalletTopupCheckout);
  const [open, setOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createTopup({
        data: {
          amountEuros,
          returnUrl: returnUrl ?? window.location.href,
          campaignBriefId: campaignBriefId ?? null,
        },
      });

      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error(t("wallet_topup.err_no_session"));
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("wallet_topup.err_stripe");
      setError(message);
      captureError(e, "payment", { flow: "wallet_topup", amountEuros });
      throw e;
    }
  }, [amountEuros, campaignBriefId, createTopup, returnUrl, t]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const showCheckout = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError(t("wallet_topup.err_not_configured"));
      setOpen(true);
      return;
    }
    setCheckoutKey((key) => key + 1);
    setOpen(true);
  };

  return (
    <>
      <Button onClick={showCheckout} disabled={disabled || amountEuros < 10} className={className}>
        {buttonLabel ?? t("wallet_topup.btn_default", { amount: amountEuros })}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) onClose?.();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>{t("wallet_topup.dialog_title")}</DialogTitle>
              <DialogDescription>{t("wallet_topup.dialog_desc")}</DialogDescription>
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
