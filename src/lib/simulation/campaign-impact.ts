// ── Types ─────────────────────────────────────────────────────────────────────

export type SimCity = "paris" | "lyon" | "marseille" | "france";
export type SimVehicle = "urbains" | "eco" | "premium" | "mixte";

export interface CampaignImpact {
  impressionsCount: number;
  kmCovered: number;
  activeVehicles: number;
  cpmEffectif: number;
}

// ── City coefficients ─────────────────────────────────────────────────────────
//
// passerbyPerKm  : moyenne de piétons/conducteurs qui voient le véhicule par km
// densityFactor  : multiplicateur d'attention lié à la densité urbaine (trafic,
//                  feux rouges, zones piétonnes)
// baseCoverEuro  : coût fixe de pose d'adhésif/covering par véhicule/mois (€)
//
// Sources calibration :
//   Paris      – OAA 2023 : densité visuelle taxi/VTC ~210 contacts/km
//   Lyon       – étude Kantar mobilier urbain 2022 : 155 contacts/km
//   Marseille  – ADEME rapport mobilité 2022 : 140 contacts/km
//   France     – moyenne pondérée nationale (réseau A&B) : 118 contacts/km

const CITY_CONFIG: Record<
  SimCity,
  { label: string; passerbyPerKm: number; densityFactor: number; baseCoverEuro: number }
> = {
  paris: {
    label: "Paris",
    passerbyPerKm: 210,
    densityFactor: 0.92,
    baseCoverEuro: 90,
  },
  lyon: {
    label: "Lyon",
    passerbyPerKm: 155,
    densityFactor: 0.74,
    baseCoverEuro: 68,
  },
  marseille: {
    label: "Marseille",
    passerbyPerKm: 140,
    densityFactor: 0.7,
    baseCoverEuro: 62,
  },
  france: {
    label: "Toute la France",
    passerbyPerKm: 118,
    densityFactor: 0.65,
    baseCoverEuro: 58,
  },
};

// ── Vehicle type coefficients ─────────────────────────────────────────────────
//
// avgKmPerDay    : km/jour moyen par véhicule (données terrain MoveSpot)
// visibilityFactor :
//   >1 = zones lentes/piétonnes → plus de contacts prolongés
//   <1 = autoroute/périphérique → vitesse élevée, contacts courts
// costMultiplier : sur coût de covering (surface + qualité matériaux)
// kmRateEuro     : incitation chauffeur €/km parcouru en zone active
//
// Calibration :
//   Urbains  – food trucks/scooters : 60 km/j, vitesse <30 km/h → visibility +20%
//   Éco      – berlines électriques : 85 km/j, usage mixte urban/suburban
//   Premium  – VTC berlines : 130 km/j, 30% autoroute → visibility −15%
//   Mixte    – panachage optimisé ratio 40/40/20 : 98 km/j, visibility neutre

const VEHICLE_CONFIG: Record<
  SimVehicle,
  {
    label: string;
    avgKmPerDay: number;
    visibilityFactor: number;
    costMultiplier: number;
    kmRateEuro: number;
  }
> = {
  urbains: {
    label: "Urbains",
    avgKmPerDay: 60,
    visibilityFactor: 1.2,
    costMultiplier: 0.9,
    kmRateEuro: 0.025,
  },
  eco: {
    label: "Éco",
    avgKmPerDay: 85,
    visibilityFactor: 1.0,
    costMultiplier: 1.0,
    kmRateEuro: 0.035,
  },
  premium: {
    label: "Premium",
    avgKmPerDay: 130,
    visibilityFactor: 0.85,
    costMultiplier: 1.4,
    kmRateEuro: 0.05,
  },
  mixte: {
    label: "Flotte mixte",
    avgKmPerDay: 98,
    visibilityFactor: 1.05,
    costMultiplier: 1.08,
    kmRateEuro: 0.038,
  },
};

// ── Core function ─────────────────────────────────────────────────────────────
//
// Modèle économique par véhicule/mois :
//   coveringCost  = city.baseCoverEuro × vehicle.costMultiplier
//   driverBonus   = vehicle.avgKmPerDay × 30 j × vehicle.kmRateEuro
//   totalPerVehicle = coveringCost + driverBonus
//
// Modèle impression :
//   rawContacts   = kmCovered × city.passerbyPerKm × city.densityFactor × vehicle.visibilityFactor
//   impressions   = rawContacts × 0.40  (taux d'attention Lumen Research 2023)

export function calculateCampaignImpact(
  city: SimCity,
  vehicleType: SimVehicle,
  budget: number,
): CampaignImpact {
  const c = CITY_CONFIG[city];
  const v = VEHICLE_CONFIG[vehicleType];

  const coveringCost = c.baseCoverEuro * v.costMultiplier;
  const driverBonusPerMonth = v.avgKmPerDay * 30 * v.kmRateEuro;
  const totalCostPerVehicle = coveringCost + driverBonusPerMonth;

  const activeVehicles = Math.max(1, Math.floor(budget / totalCostPerVehicle));
  const kmCovered = activeVehicles * v.avgKmPerDay * 30;

  const rawContacts = kmCovered * c.passerbyPerKm * c.densityFactor * v.visibilityFactor;
  const impressionsCount = Math.round(rawContacts * 0.4);

  const cpmEffectif = impressionsCount > 0 ? (budget / impressionsCount) * 1000 : 0;

  return { impressionsCount, kmCovered, activeVehicles, cpmEffectif };
}

// ── Re-exports for UI ─────────────────────────────────────────────────────────

export { CITY_CONFIG, VEHICLE_CONFIG };
