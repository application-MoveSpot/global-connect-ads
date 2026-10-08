import { useTranslation } from "react-i18next";
import { usePaymentsConfig } from "@/hooks/usePaymentsConfig";

export function PaymentTestModeBanner() {
  const { t } = useTranslation();
  const config = usePaymentsConfig();

  if (!config) return null;

  if (!config.publishableKey) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">
        {t("payment_test_mode_banner.not_configured")}
      </div>
    );
  }

  if (config.environment === "sandbox") {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-warning">
        {t("payment_test_mode_banner.sandbox")}
      </div>
    );
  }

  return null;
}
