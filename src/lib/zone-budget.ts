/** Estimation budgétaire d'une zone de ciblage géographique. */

/** Densité tarifaire indicative : € / km² / jour de diffusion. */
export const RATE_EUR_PER_KM2_PER_DAY = 1.8;
/** Plancher journalier par véhicule (coût de pose amorti). */
export const MIN_EUR_PER_DAY = 25;

export function estimateZoneBudget(areaKm2: number, days: number, vehicles = 1) {
  const d = Math.max(1, days);
  const v = Math.max(1, vehicles);
  const zoneCost = areaKm2 * RATE_EUR_PER_KM2_PER_DAY * d * v;
  const floor = MIN_EUR_PER_DAY * d * v;
  const total = Math.max(zoneCost, floor);
  return {
    total: Math.round(total),
    perDay: Math.round(total / d),
    areaKm2,
    days: d,
    vehicles: v,
  };
}
