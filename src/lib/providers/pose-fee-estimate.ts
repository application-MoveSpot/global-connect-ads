/**
 * Grille de tarification règles-métier pour la pose et dépose d'adhésifs publicitaires.
 * Option A : règles déterministes + validation IA optionnelle.
 *
 * Fourchette = base_format × coeff_véhicule × coeff_ville
 */

// ─── Format publicitaire ───────────────────────────────────────────────────────

export type FormatKey =
  | "sticker_partiel" // stickers / micro-perforé partiel  < 2 m²
  | "demi_covering" // latéraux + arrière                  2–5 m²
  | "total_covering" // total véhicule utilitaire           5–12 m²
  | "grand_format"; // bus, semi, grand format             > 12 m²

export const FORMAT_LABELS: Record<FormatKey, string> = {
  sticker_partiel: "Stickers / adhésif partiel",
  demi_covering: "Demi-covering (latéraux + arrière)",
  total_covering: "Total covering véhicule utilitaire",
  grand_format: "Grand format (bus, semi, remorque)",
};

/** Prix de pose de base en euros (hors coefficients). */
const BASE_POSE: Record<FormatKey, { min: number; max: number }> = {
  sticker_partiel: { min: 60, max: 120 },
  demi_covering: { min: 150, max: 280 },
  total_covering: { min: 280, max: 450 },
  grand_format: { min: 450, max: 800 },
};

/** Prix de dépose = env. 70 % de la pose (moins technique). */
const BASE_DEPOSE: Record<FormatKey, { min: number; max: number }> = {
  sticker_partiel: { min: 40, max: 80 },
  demi_covering: { min: 100, max: 200 },
  total_covering: { min: 200, max: 320 },
  grand_format: { min: 320, max: 560 },
};

// ─── Type de véhicule ──────────────────────────────────────────────────────────

type VehicleCoeffKey = "micro" | "standard" | "utilitaire" | "grand";

/** Coefficient multiplicateur selon le gabarit du véhicule. */
const VEHICLE_COEFF: Record<VehicleCoeffKey, number> = {
  micro: 0.7, // scooter, vélo cargo, triporteur, tuktuk, sac à dos
  standard: 1.0, // voiture, taxi, VTC
  utilitaire: 1.3, // van, food truck, camionnette
  grand: 1.7, // bus, semi, grand format
};

const VEHICLE_TYPE_TO_COEFF: Record<string, VehicleCoeffKey> = {
  scooter: "micro",
  velo_cargo: "micro",
  velo_remorque: "micro",
  triporteur: "micro",
  tutuk: "micro",
  sac_a_dos_lcd: "micro",
  sac_a_dos_affiche: "micro",
  voiture: "standard",
  taxi: "standard",
  autre: "standard",
  van: "utilitaire",
  food_truck: "utilitaire",
};

export function vehicleCoeff(vehicleType: string): number {
  return VEHICLE_COEFF[VEHICLE_TYPE_TO_COEFF[vehicleType] ?? "standard"];
}

// ─── Zone géographique ─────────────────────────────────────────────────────────

export type ZoneKey = "paris" | "grande_ville" | "province" | "dom";

export const ZONE_LABELS: Record<ZoneKey, string> = {
  paris: "Paris / Île-de-France",
  grande_ville: "Grande ville (Lyon, Marseille, Bordeaux, Nantes…)",
  province: "Province / ville moyenne",
  dom: "DOM (Guadeloupe, Martinique, Réunion…)",
};

const ZONE_COEFF: Record<ZoneKey, number> = {
  paris: 1.25,
  grande_ville: 1.1,
  province: 1.0,
  dom: 1.25,
};

/** Détecte la zone à partir d'un texte de localisation (ville, adresse…). */
export function detectZone(location: string): ZoneKey {
  const l = location.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/paris|ile.de.france|idf|versailles|boulogne|vincennes|montreuil|saint.cloud/.test(l))
    return "paris";
  if (/guadeloupe|martinique|reunion|mayotte|guyane|dom/.test(l)) return "dom";
  if (
    /lyon|marseille|bordeaux|nantes|toulouse|montpellier|lille|nice|rennes|strasbourg|grenoble/.test(
      l,
    )
  )
    return "grande_ville";
  return "province";
}

// ─── Calcul de la fourchette ───────────────────────────────────────────────────

export type PoseFeeRange = {
  poseMin: number;
  poseMax: number;
  deposeMin: number;
  deposeMax: number;
  format: FormatKey;
  zone: ZoneKey;
  vehicleType: string;
};

/**
 * Estime la fourchette de frais poseur pour une campagne.
 * Résultat arrondi à l'euro entier.
 */
export function estimatePoseFee(opts: {
  formatKey: FormatKey;
  vehicleType: string;
  location: string;
}): PoseFeeRange {
  const { formatKey, vehicleType, location } = opts;
  const zone = detectZone(location);
  const vc = vehicleCoeff(vehicleType);
  const zc = ZONE_COEFF[zone];

  const poseBase = BASE_POSE[formatKey];
  const deposeBase = BASE_DEPOSE[formatKey];

  return {
    poseMin: Math.round(poseBase.min * vc * zc),
    poseMax: Math.round(poseBase.max * vc * zc),
    deposeMin: Math.round(deposeBase.min * vc * zc),
    deposeMax: Math.round(deposeBase.max * vc * zc),
    format: formatKey,
    zone,
    vehicleType,
  };
}

/** Déduit le FormatKey à partir de la surface en m² ou du libellé format_publicitaire. */
export function inferFormatKey(
  surfaceM2: number | null,
  formatPublicitaire: string | null,
): FormatKey {
  if (formatPublicitaire) {
    const f = formatPublicitaire.toLowerCase();
    if (/total|complet|full/.test(f)) {
      return surfaceM2 && surfaceM2 > 12 ? "grand_format" : "total_covering";
    }
    if (/demi|lateral|partiel/.test(f)) return "demi_covering";
    if (/grand|bus|semi|remorque/.test(f)) return "grand_format";
    if (/sticker|adhesif|micro/.test(f)) return "sticker_partiel";
  }
  if (surfaceM2 !== null) {
    if (surfaceM2 > 12) return "grand_format";
    if (surfaceM2 >= 5) return "total_covering";
    if (surfaceM2 >= 2) return "demi_covering";
    return "sticker_partiel";
  }
  return "demi_covering"; // défaut raisonnable
}

/** Validation : vérifie si un devis poseur est dans la fourchette recommandée (±30 %). */
export function validateInstallerQuote(
  quoteCents: number,
  range: PoseFeeRange,
  operation: "pose" | "depose",
): { valid: boolean; reason?: string } {
  const min = operation === "pose" ? range.poseMin : range.deposeMin;
  const max = operation === "pose" ? range.poseMax : range.deposeMax;
  const toleranceLow = Math.round(min * 0.7);
  const toleranceHigh = Math.round(max * 1.3);
  const quoteEuros = Math.round(quoteCents / 100);

  if (quoteEuros < toleranceLow) {
    return {
      valid: false,
      reason: `Devis (${quoteEuros} €) inférieur au plancher recommandé (${toleranceLow} €). Vérifiez la prestation incluse.`,
    };
  }
  if (quoteEuros > toleranceHigh) {
    return {
      valid: false,
      reason: `Devis (${quoteEuros} €) supérieur au plafond recommandé (${toleranceHigh} €). Négociation conseillée.`,
    };
  }
  return { valid: true };
}
