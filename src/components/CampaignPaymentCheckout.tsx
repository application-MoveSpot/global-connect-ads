import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCampaignCheckout } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
};

export function CampaignPaymentCheckout({ campaignRequestId, totalPriceEur }: Props) {
  const create = useServerFn(createCampaignCheckout);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = async (): Promise<string> => {
    const env = getStripeEnvironment();
    const res = await create({ data: {
      campaignRequestId,
      environment: env,
      returnUrl: `${window.location.origin}/annonceur/suivi/${campaignRequestId}?paid=1`,
    }});
    if ("error" in res) { setError(res.error); throw new Error(res.error); }
    return res.clientSecret;
  };

  if (!open) {
    return (
      <div className="space-y-2">
        <Button onClick={() => setOpen(true)}>
          Payer {totalPriceEur.toFixed(2)} €
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div id="checkout" className="rounded-md border bg-background">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
