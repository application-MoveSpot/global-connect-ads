import { useCallback, useMemo, useState } from "react";
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
};

export function WalletTopupCheckout({ amountEuros, returnUrl, buttonLabel, disabled, className, campaignBriefId }: Props) {
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
      if (!result.clientSecret) throw new Error("Stripe n'a pas retourné de session de paiement.");
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur Stripe";
      setError(message);
      throw e;
    }
  }, [amountEuros, campaignBriefId, createTopup, returnUrl]);

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
      <Button onClick={showCheckout} disabled={disabled || amountEuros < 10} className={className}>
        {buttonLabel ?? `Recharger ${amountEuros} €`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Recharge portefeuille</DialogTitle>
              <DialogDescription>
                Paiement sécurisé par carte bancaire ou en cryptomonnaie (USDC), si activé sur votre compte Stripe.
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