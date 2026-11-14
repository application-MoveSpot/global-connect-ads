import { useTranslation } from "react-i18next";
import { CampaignPaymentCheckout } from "./CampaignPaymentCheckout";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
  vehicleQuantity: number;
  onPaid?: () => void;
};

export function PaymentModeSelector({
  campaignRequestId,
  totalPriceEur,
  onPaid,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">{t("payment_mode.question")}</p>
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <CampaignPaymentCheckout
          campaignRequestId={campaignRequestId}
          totalPriceEur={totalPriceEur}
          onPaid={onPaid}
        />
      </div>
    </div>
  );
}
