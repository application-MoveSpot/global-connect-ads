import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createCampaignSubscriptionCheckout } from "@/lib/payments/payments.functions";
import { captureError } from "@/lib/sentry";
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
  campaignRequestId?: string | null;
  vehicleQuantity: number;
  priceId?: string;
  trialPeriodDays?: number;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
};

export function CampaignTrialCheckout({
  campaignRequestId,
  vehicleQuantity,
  priceId = "campaign_vehicle_monthly",
  trialPeriodDays = 14,
  disabled,
  className,
  buttonLabel,
}: Props) {
  const { t } = useTranslation();
  const createSubscription = useServerFn(createCampaignSubscriptionCheckout);
  const [open, setOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createSubscription({
        data: {
          priceId,
          vehicleQuantity,
          campaignRequestId: campaignRequestId ?? null,
          trialPeriodDays,
          returnUrl: `${window.location.origin}/annonceur/essai-active`,
        },
      });

      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error(t("campaign_trial.err_no_session"));
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("campaign_trial.err_stripe");
      setError(message);
      captureError(e, "payment", { flow: "campaign_trial", vehicleQuantity, priceId });
      throw e;
    }
  }, [campaignRequestId, createSubscription, priceId, trialPeriodDays, vehicleQuantity]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const showCheckout = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError(t("campaign_trial.err_not_configured"));
      setOpen(true);
      return;
    }
    setCheckoutKey((key) => key + 1);
    setOpen(true);
  };

  return (
    <>
      <Button
        onClick={showCheckout}
        disabled={disabled || vehicleQuantity < 1}
        className={className}
      >
        {buttonLabel ?? t("campaign_trial.btn_default")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>{t("campaign_trial.dialog_title")}</DialogTitle>
              <DialogDescription>{t("campaign_trial.dialog_desc")}</DialogDescription>
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
