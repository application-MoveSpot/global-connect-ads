/**
 * Barèmes forfaitaires liés au vinyle publicitaire (CGV Art. 2 / CGU Art. 11bis & Art. 25).
 *
 * Forfait mise en service (HT) — campagnes < 15 jours :
 *   covering_total  → 99 € HT (complet)
 *   demi_covering   → 79 € HT (double)
 *   stickers / affiche / boxled → 59 € HT (simple)
 *
 * Barème refacturation incident (TTC) — rejet admin :
 *   complet → 89 € TTC | double → 69 € TTC | simple → 49 € TTC
 *
 * Supplément déplacement : 35 € TTC (hors atelier, ≤ 25 km)
 */

export type VinylTier = "simple" | "double" | "complet";

export function getVinylTier(adFormat: string | null | undefined): VinylTier {
  if (adFormat === "covering_total") return "complet";
  if (adFormat === "demi_covering") return "double";
  return "simple";
}

/** Forfait mise en service HT (centimes). 0 si ≥ 15 jours ou format magnétique/kit. */
export const SETUP_FEE_HT_CENTS: Record<VinylTier, number> = {
  simple:  5_900, // 59 € HT
  double:  7_900, // 79 € HT
  complet: 9_900, // 99 € HT
};

/** Barème refacturation incident TTC (centimes). */
export const INCIDENT_CHARGE_TTC_CENTS: Record<VinylTier, number> = {
  simple:  4_900, // 49 € TTC
  double:  6_900, // 69 € TTC
  complet: 8_900, // 89 € TTC
};

/** Supplément déplacement TTC (centimes). */
export const TRAVEL_SUPPLEMENT_TTC_CENTS = 3_500; // 35 € TTC

/**
 * Calcule le forfait mise en service en centimes HT.
 * Retourne 0 si la campagne dure ≥ 15 jours (pose offerte selon CGV Art. 2).
 */
export function computeSetupFeeCents(
  adFormat: string | null | undefined,
  daysCount: number | null | undefined,
): number {
  if (!daysCount || daysCount >= 15) return 0;
  return SETUP_FEE_HT_CENTS[getVinylTier(adFormat)];
}

/**
 * Calcule le montant à refacturer au propriétaire après rejet d'un incident vinyle.
 * @param adFormat    Format publicitaire de la campagne
 * @param withTravel  true si l'intervention a nécessité un déplacement hors atelier
 */
export function computeIncidentChargeCents(
  adFormat: string | null | undefined,
  withTravel: boolean,
): number {
  const base = INCIDENT_CHARGE_TTC_CENTS[getVinylTier(adFormat)];
  return base + (withTravel ? TRAVEL_SUPPLEMENT_TTC_CENTS : 0);
}
