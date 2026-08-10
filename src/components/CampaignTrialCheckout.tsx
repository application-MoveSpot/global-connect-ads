import { useCallback, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createCampaignSubscriptionCheckout } from "@/lib/payments.functions";
import { getPaymentsConfig, getStripe } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

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
  buttonLabel = "Activer mon essai gratuit de 14 jours",
}: Props) {
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
      if (!result.clientSecret) throw new Error("Stripe n'a pas retourné de session de paiement.");
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur Stripe";
      setError(message);
      throw e;
    }
  }, [campaignRequestId, createSubscription, priceId, trialPeriodDays, vehicleQuantity]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const showCheckout = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError("Le paiement par carte n'est pas encore configuré. Ajoutez vos clés Stripe pour l'activer.");
      setOpen(true);
      return;
    }
    setCheckoutKey((key) => key + 1);
    setOpen(true);
  };

  return (
    <>
      <Button onClick={showCheckout} disabled={disabled || vehicleQuantity < 1} className={className}>
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Essai gratuit de 14 jours</DialogTitle>
              <DialogDescription>
                Aucun prélèvement pendant 14 jours. Vous pouvez annuler à tout moment avant la fin de l'essai.
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
