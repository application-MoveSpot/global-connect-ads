import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegion } from "@/lib/region-context";
import { formatAmountFromEur, getCurrencyFromRegion } from "@/lib/currency";
import { toast } from "sonner";
import { FlutterwaveCheckout, isFlutterwaveRegion } from "./FlutterwaveCheckout";

// Régions où Stripe ne fonctionne pas bien → fallback virement ou Flutterwave
const STRIPE_UNSUPPORTED_REGIONS = ["afrique"] as const;

export function isStripeUnsupportedRegion(region: string): boolean {
  return STRIPE_UNSUPPORTED_REGIONS.includes(region as (typeof STRIPE_UNSUPPORTED_REGIONS)[number]);
}

const BANK_DETAILS = {
  beneficiary: "MoveSpot SAS",
  iban: "FR76 3000 4028 3700 0100 0000 943",
  bic: "BNPAFRPPXXX",
  bank: "BNP Paribas",
};

type Props = {
  amountEur: number;
  userEmail?: string;
  userName?: string;
  onConfirm?: (reference: string) => void;
};

export function BankTransferCheckout({ amountEur, userEmail, userName, onConfirm }: Props) {
  const { t } = useTranslation();
  const { region } = useRegion();
  const currency = getCurrencyFromRegion(region);

  // Prefer Flutterwave for Africa when API key is configured
  if (isFlutterwaveRegion(region) && userEmail) {
    return (
      <FlutterwaveCheckout
        amountEur={amountEur}
        region={region}
        userEmail={userEmail}
        userName={userName}
        onSuccess={(txRef) => onConfirm?.(txRef)}
      />
    );
  }
  const [confirmed, setConfirmed] = useState(false);
  const reference = `MS-${Date.now().toString(36).toUpperCase()}`;

  function handleConfirm() {
    setConfirmed(true);
    toast.success(
      t("payment.bank_transfer.success", {
        defaultValue: "Demande de virement enregistrée.",
      }),
    );
    onConfirm?.(reference);
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-sm space-y-2">
        <p className="font-semibold text-green-700 dark:text-green-400">
          {t("payment.bank_transfer.success", { defaultValue: "Demande enregistrée." })}
        </p>
        <p className="text-muted-foreground">
          {t("payment.bank_transfer.reference", { defaultValue: "Référence" })} :{" "}
          <strong className="font-mono">{reference}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-base">
          {t("payment.bank_transfer.title", { defaultValue: "Virement bancaire" })}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("payment.bank_transfer.subtitle", {
            defaultValue:
              "Pour les marchés non couverts par Stripe. Traitement sous 2–3 jours ouvrés.",
          })}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        {[
          {
            label: t("payment.bank_transfer.beneficiary", { defaultValue: "Bénéficiaire" }),
            value: BANK_DETAILS.beneficiary,
          },
          {
            label: t("payment.bank_transfer.iban", { defaultValue: "IBAN" }),
            value: BANK_DETAILS.iban,
            mono: true,
          },
          {
            label: t("payment.bank_transfer.bic", { defaultValue: "BIC / SWIFT" }),
            value: BANK_DETAILS.bic,
            mono: true,
          },
          {
            label: t("payment.bank_transfer.reference", { defaultValue: "Référence" }),
            value: reference,
            mono: true,
            highlight: true,
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0"
          >
            <span className="text-muted-foreground shrink-0">{row.label}</span>
            <span
              className={`${row.mono ? "font-mono" : ""} ${row.highlight ? "text-primary font-semibold" : ""} text-right`}
            >
              {row.value}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-1.5">
          <span className="text-muted-foreground">
            {t("common.amount", { defaultValue: "Montant" })}
          </span>
          <span className="font-semibold text-primary">
            {formatAmountFromEur(amountEur, currency)}
            {currency !== "EUR" && (
              <span className="text-xs text-muted-foreground ml-1">≈ {amountEur} €</span>
            )}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("payment.bank_transfer.reference_hint", {
          defaultValue: "Mentionnez la référence dans votre virement bancaire.",
        })}
      </p>

      <button
        onClick={handleConfirm}
        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
      >
        {t("payment.bank_transfer.confirm_btn", { defaultValue: "Confirmer le virement" })}
      </button>
    </div>
  );
}
