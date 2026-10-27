import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { captureError } from "@/lib/sentry";
import { createCinetPayTopupCheckout } from "@/lib/payments/cinetpay.server";
import { convertFromEur } from "@/lib/currency";

type Props = {
  amountEuros: number;
  returnUrl?: string;
  campaignBriefId?: string | null;
  className?: string;
};

export function CinetPayTopupCheckout({ amountEuros, returnUrl, campaignBriefId, className }: Props) {
  const { t } = useTranslation();
  const initCheckout = useServerFn(createCinetPayTopupCheckout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountXof = Math.round(convertFromEur(amountEuros, "XOF"));

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const result = await initCheckout({
        data: {
          amountXof,
          returnUrl: returnUrl ?? window.location.href,
          campaignBriefId: campaignBriefId ?? null,
        },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.href = result.payment_url;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("cinetpay_topup.err_generic");
      setError(message);
      captureError(e, "payment", { flow: "cinetpay_topup", amountEuros });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-4 ${className ?? ""}`}>
      <div>
        <h3 className="font-semibold text-base">{t("cinetpay_topup.title")}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{t("cinetpay_topup.subtitle")}</p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary">
          {t("cinetpay_topup.amount_xof", { amount: amountXof.toLocaleString("fr-SN") })}
        </span>
        <span className="text-sm text-muted-foreground">≈ {amountEuros} €</span>
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("common.loading") : t("cinetpay_topup.pay_btn")}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground text-center">{t("cinetpay_topup.powered_by")}</p>
    </div>
  );
}
