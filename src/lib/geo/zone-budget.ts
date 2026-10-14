/** Estimation budgétaire d'une zone de ciblage géographique. */

/** Densité tarifaire indicative : € / km² / jour de diffusion. */
export const RATE_EUR_PER_KM2_PER_DAY = 1.8;
/** Plancher journalier par véhicule (coût de pose amorti). */
export const MIN_EUR_PER_DAY = 25;
/** Coefficient appliqué quand la zone touche une grande agglomération. */
export const DENSE_ZONE_MULTIPLIER = 1.5;

export type LngLat = [number, number];

/** Bounding box approximative [minLng, minLat, maxLng, maxLat] d'un centre-ville dense. */
type Metro = { name: string; bbox: [number, number, number, number] };

/** Approximation par bounding box des principales agglomérations (France, DOM-TOM, Miami). */
export const DENSE_METROS: Metro[] = [
  // Métropoles françaises
  { name: "Paris", bbox: [2.224, 48.815, 2.47, 48.902] },
  { name: "Lyon", bbox: [4.77, 45.707, 4.9, 45.808] },
  { name: "Marseille", bbox: [5.29, 43.21, 5.44, 43.36] },
  { name: "Toulouse", bbox: [1.36, 43.55, 1.51, 43.66] },
  { name: "Bordeaux", bbox: [-0.65, 44.79, -0.53, 44.91] },
  { name: "Lille", bbox: [2.98, 50.58, 3.14, 50.68] },
  { name: "Nice", bbox: [7.2, 43.66, 7.32, 43.74] },
  { name: "Nantes", bbox: [-1.61, 47.17, -1.48, 47.27] },
  { name: "Strasbourg", bbox: [7.68, 48.53, 7.82, 48.63] },
  { name: "Montpellier", bbox: [3.82, 43.58, 3.94, 43.66] },
  { name: "Rennes", bbox: [-1.73, 48.07, -1.6, 48.15] },
  { name: "Grenoble", bbox: [5.66, 45.14, 5.78, 45.21] },
  // DOM-TOM
  { name: "Pointe-à-Pitre", bbox: [-61.56, 16.21, -61.52, 16.25] },
  { name: "Basse-Terre", bbox: [-61.74, 15.99, -61.7, 16.02] },
  { name: "Fort-de-France", bbox: [-61.09, 14.59, -61.03, 14.63] },
  { name: "Saint-Denis (La Réunion)", bbox: [55.42, -20.93, 55.48, -20.88] },
  { name: "Cayenne", bbox: [-52.35, 4.9, -52.28, 4.95] },
  // Miami (beachhead US)
  { name: "Miami", bbox: [-80.32, 25.7, -80.13, 25.86] },
  { name: "Miami Beach", bbox: [-80.15, 25.77, -80.11, 25.85] },
];

function bboxOf(coordinates: LngLat[]): [number, number, number, number] {
  const lngs = coordinates.map((c) => c[0]);
  const lats = coordinates.map((c) => c[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function bboxIntersect(a: [number, number, number, number], b: [number, number, number, number]) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Retourne l'agglomération dense recoupée par le polygone, sinon null. */
export function findDenseMetro(coordinates: LngLat[] | null | undefined): Metro | null {
  if (!coordinates || coordinates.length < 3) return null;
  const box = bboxOf(coordinates);
  return DENSE_METROS.find((m) => bboxIntersect(box, m.bbox)) ?? null;
}

export function estimateZoneBudget(
  areaKm2: number,
  days: number,
  vehicles = 1,
  coordinates?: LngLat[] | null,
) {
  const d = Math.max(1, days);
  const v = Math.max(1, vehicles);
  const metro = findDenseMetro(coordinates);
  const multiplier = metro ? DENSE_ZONE_MULTIPLIER : 1;
  const rate = RATE_EUR_PER_KM2_PER_DAY * multiplier;
  const zoneCost = areaKm2 * rate * d * v;
  const floor = MIN_EUR_PER_DAY * d * v;
  const total = Math.max(zoneCost, floor);
  return {
    total: Math.round(total),
    perDay: Math.round(total / d),
    areaKm2,
    days: d,
    vehicles: v,
    multiplier,
    ratePerKm2PerDay: Math.round(rate * 100) / 100,
    denseMetro: metro?.name ?? null,
  };
}
