import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripePublicConfig, type StripePublicConfig } from "./stripe-config.functions";
import { getConsent } from "@/lib/consent";

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
  // Ne pas charger le script Stripe (dépôt de cookies tiers) sans consentement explicite
  // Bloqué uniquement sur refus explicite : un consentement non encore exprimé
  // (null) ne doit pas empêcher le paiement, comme pour MapConsentGate.
  if (getConsent() === "refused") return Promise.resolve(null);

  if (!stripePromise) {
    stripePromise = getPaymentsConfig().then((config) =>
      config.publishableKey ? loadStripe(config.publishableKey) : null,
    );
  }
  return stripePromise;
}

/** Réinitialise le cache Stripe (appelé quand l'utilisateur change son consentement). */
export function resetStripeCache(): void {
  stripePromise = null;
}
