import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { createCampaignSubscriptionCheckout } from "@/lib/payments/payments.functions";
import { captureError } from "@/lib/sentry";
import { Button } from "@/components/ui/button";

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
  const [error, setError] = useState<string | null>(null);
  const [btnLoading, setBtnLoading] = useState(false);

  const handleCheckout = async () => {
    setError(null);
    setBtnLoading(true);
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
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (!result.url) {
        setError(t("campaign_trial.err_not_configured"));
        return;
      }
      window.location.href = result.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("campaign_trial.err_stripe");
      setError(message);
      captureError(e, "payment", { flow: "campaign_trial", vehicleQuantity, priceId });
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleCheckout}
        disabled={disabled || vehicleQuantity < 1 || btnLoading}
        className={className}
      >
        {btnLoading ? "..." : (buttonLabel ?? t("campaign_trial.btn_default"))}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
