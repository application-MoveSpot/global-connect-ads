/**
 * Plans d'abonnement prestataire (poseurs / ateliers covering & signalétique).
 * Source unique : la carte d'abonnement et les pages publiques lisent ces valeurs.
 */
export const PROVIDER_PLANS = [
  { id: "provider_starter", label: "Starter", amountEur: 29 },
  { id: "provider_standard", label: "Standard", amountEur: 42 },
  { id: "provider_pro", label: "Pro", amountEur: 59 },
] as const;

export type ProviderPlanId = (typeof PROVIDER_PLANS)[number]["id"];

/** Durée de l'essai gratuit, en jours. */
export const PROVIDER_TRIAL_DAYS = 14;
