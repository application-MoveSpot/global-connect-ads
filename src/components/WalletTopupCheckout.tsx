import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createWalletTopupCheckout } from "@/lib/wallet.functions";

export function WalletTopupCheckout({ amountEuros, returnUrl }: { amountEuros: number; returnUrl: string }) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createWalletTopupCheckout({
      data: { amountEuros, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe n'a pas renvoyé de client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
