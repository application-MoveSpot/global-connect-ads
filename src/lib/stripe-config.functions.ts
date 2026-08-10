import { createServerFn } from "@tanstack/react-start";

export type StripePublicConfig = {
  publishableKey: string | null;
  environment: "sandbox" | "live" | null;
};

/**
 * Retourne la clé publiable Stripe (donnée publique par nature) et l'environnement
 * déduit de la clé secrète configurée côté serveur.
 */
export const getStripePublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<StripePublicConfig> => {
    const publishableKey = process.env["STRIPE_PUBLISHABLE_KEY"] ?? null;
    const secretKey = process.env["STRIPE_SECRET_KEY"] ?? null;

    if (!publishableKey || !secretKey) {
      return { publishableKey: null, environment: null };
    }

    return {
      publishableKey,
      environment: secretKey.startsWith("sk_live_") ? "live" : "sandbox",
    };
  },
);
