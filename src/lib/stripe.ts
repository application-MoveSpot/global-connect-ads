import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripePublicConfig, type StripePublicConfig } from "./stripe-config.functions";

export type StripeEnv = "sandbox" | "live";

let configPromise: Promise<StripePublicConfig> | null = null;

export function getPaymentsConfig(): Promise<StripePublicConfig> {
  if (!configPromise) {
    configPromise = getStripePublicConfig().catch(() => ({ publishableKey: null, environment: null }));
  }
  return configPromise;
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = getPaymentsConfig().then((config) =>
      config.publishableKey ? loadStripe(config.publishableKey) : null,
    );
  }
  return stripePromise;
}
