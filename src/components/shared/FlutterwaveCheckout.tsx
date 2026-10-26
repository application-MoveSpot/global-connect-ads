import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getCurrencyFromRegion, convertFromEur, CURRENCY_CONFIGS } from "@/lib/currency";
import type { Region } from "@/lib/currency";

// Loaded from Flutterwave inline script
declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveConfig) => void;
  }
}

interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: { email: string; name?: string; phonenumber?: string };
  customizations: { title: string; description: string; logo?: string };
  callback: (data: { status: string; transaction_id?: string; tx_ref: string }) => void;
  onclose: () => void;
}

const FLW_SCRIPT_URL = "https://checkout.flutterwave.com/v3.js";
const FLW_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY as string | undefined;

function loadFlwScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${FLW_SCRIPT_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = FLW_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Flutterwave SDK failed to load"));
    document.head.appendChild(script);
  });
}

type Props = {
  amountEur: number;
  region: Region;
  userEmail: string;
  userName?: string;
  description?: string;
  onSuccess?: (txRef: string, transactionId?: string) => void;
  onClose?: () => void;
};

export function FlutterwaveCheckout({
  amountEur,
  region,
  userEmail,
  userName,
  description,
  onSuccess,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const txRef = useRef(`MS-${Date.now().toString(36).toUpperCase()}`);

  const currency = getCurrencyFromRegion(region);
  const amount = Math.round(convertFromEur(amountEur, currency));
  const { symbol } = CURRENCY_CONFIGS[currency];

  useEffect(() => {
    if (!FLW_PUBLIC_KEY) return;
    loadFlwScript()
      .then(() => setSdkReady(true))
      .catch(() => {
        // SDK failed to load — caller will show bank transfer fallback
      });
  }, []);

  function handlePay() {
    if (!FLW_PUBLIC_KEY || !window.FlutterwaveCheckout) return;
    setLoading(true);
    window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: txRef.current,
      amount,
      currency,
      payment_options: "card,mobilemoney,ussd,banktransfer",
      customer: { email: userEmail, name: userName },
      customizations: {
        title: "MoveSpot",
        description:
          description ??
          t("payment.flutterwave.description", { defaultValue: "Recharge portefeuille campagne" }),
      },
      callback(data) {
        setLoading(false);
        if (data.status === "successful" || data.status === "completed") {
          toast.success(t("payment.flutterwave.success", { defaultValue: "Paiement confirmé !" }));
          onSuccess?.(data.tx_ref, data.transaction_id);
        } else {
          toast.error(t("payment.flutterwave.failed", { defaultValue: "Paiement non complété." }));
        }
      },
      onclose() {
        setLoading(false);
        onClose?.();
      },
    });
  }

  if (!FLW_PUBLIC_KEY) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-base">
          {t("payment.flutterwave.title", { defaultValue: "Payer en ligne" })}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("payment.flutterwave.subtitle", {
            defaultValue: "Carte bancaire, Mobile Money (Wave, MTN, M-Pesa…)",
          })}
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary">
          {symbol} {amount.toLocaleString()}
        </span>
        {currency !== "EUR" && (
          <span className="text-sm text-muted-foreground">≈ {amountEur} €</span>
        )}
      </div>

      <button
        onClick={handlePay}
        disabled={!sdkReady || loading}
        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? t("common.loading", { defaultValue: "Chargement…" })
          : sdkReady
            ? t("payment.flutterwave.pay_btn", { defaultValue: "Payer maintenant" })
            : t("common.loading", { defaultValue: "Chargement…" })}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        {t("payment.flutterwave.powered_by", {
          defaultValue: "Propulsé par Flutterwave — sécurisé 3DS",
        })}
      </p>
    </div>
  );
}

/** Returns true when Flutterwave is configured and the region is supported */
export function isFlutterwaveRegion(region: string): boolean {
  return !!FLW_PUBLIC_KEY && ["afrique", "amerique", "asie"].includes(region);
}
