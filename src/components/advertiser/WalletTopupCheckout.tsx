import { useState } from "react";
import { useTranslation } from "react-i18next";
import { captureError } from "@/lib/sentry";
import { useServerFn } from "@tanstack/react-start";
import { createWalletTopupCheckout } from "@/lib/payments/payments.functions";
import { Button } from "@/components/ui/button";

type Props = {
  amountEuros: number;
  returnUrl?: string;
  buttonLabel?: string;
  disabled?: boolean;
  className?: string;
  campaignBriefId?: string | null;
};

export function WalletTopupCheckout({
  amountEuros,
  returnUrl,
  buttonLabel,
  disabled,
  className,
  campaignBriefId,
}: Props) {
  const { t } = useTranslation();
  const createTopup = useServerFn(createWalletTopupCheckout);
  const [error, setError] = useState<string | null>(null);
  const [btnLoading, setBtnLoading] = useState(false);

  const handleTopup = async () => {
    setError(null);
    setBtnLoading(true);
    try {
      const result = await createTopup({
        data: {
          amountEuros,
          returnUrl: returnUrl ?? window.location.href,
          campaignBriefId: campaignBriefId ?? null,
        },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (!result.url) {
        setError(t("wallet_topup.err_not_configured"));
        return;
      }
      window.location.href = result.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("wallet_topup.err_stripe");
      setError(message);
      captureError(e, "payment", { flow: "wallet_topup", amountEuros });
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleTopup}
        disabled={disabled || amountEuros < 10 || btnLoading}
        className={className}
      >
        {btnLoading
          ? "..."
          : (buttonLabel ?? t("wallet_topup.btn_default", { amount: amountEuros }))}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
