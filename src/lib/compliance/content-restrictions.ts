// Content categories and their market restrictions for mobile fleet advertising.
// Used to gate brief submission and surface jurisdiction-specific warnings.
//
// NOT listed here (outside MoveSpot's scope entirely — not accepted, not shown):
//   Cannabis / CBD, Tobacco / Vaping, Gambling / Sports Betting.
//   These are handled as forbidden keywords in forbidden-keywords.ts.
//
// US city-level restrictions:
//   Alcohol:   FTC/TTB rules; state ABC laws; 500 ft buffer from schools/churches (most states).
//   Pharma:    FDA 21 CFR Part 202; mandatory brief summary for Rx drugs.
//   Financial: SEC/FINRA Rule 2210; state-level investment adviser restrictions.
//
// French restrictions (national law — apply to all cities equally):
//   Alcohol:   Loi Évin (art. L.3323-2 CSP) — forbidden within 100 m of schools/sports/youth venues.
//   Pharma:    ANSM + HAS rules; Rx drug advertising to general public is prohibited.
//   Financial: AMF doctrine; claims must be accurate and not misleading (art. L.533-12 CMF).

export type ContentCategory = {
  id: string;
  labelEn: string;
  labelFr: string;
  // US cities where this category requires a disclaimer.
  restrictedIn: string[];
  // US cities where this category is entirely blocked.
  blockedIn: string[];
  // Shown to the advertiser when US restriction applies.
  disclaimer?: string;
  // France: national-level restriction applies regardless of city.
  frRestricted?: boolean;
  // France: category not accepted at all.
  frBlocked?: boolean;
  // Shown to the advertiser when French restriction applies.
  frDisclaimer?: string;
};

export const CONTENT_CATEGORIES: ContentCategory[] = [
  // ── Generally allowed everywhere ──────────────────────────────────────────
  {
    id: "retail_fashion",
    labelEn: "Retail / Fashion",
    labelFr: "Commerce / Mode",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "food_beverage_na",
    labelEn: "Food & Non-alcoholic Beverage",
    labelFr: "Restauration / Boissons sans alcool",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "automotive",
    labelEn: "Automotive",
    labelFr: "Automobile",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "tech_digital",
    labelEn: "Tech / Digital",
    labelFr: "Tech / Numérique",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "entertainment_media",
    labelEn: "Entertainment / Media",
    labelFr: "Divertissement / Médias",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "real_estate",
    labelEn: "Real Estate",
    labelFr: "Immobilier",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "health_fitness",
    labelEn: "Health / Fitness (non-Rx)",
    labelFr: "Santé / Fitness (sans Rx)",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "education",
    labelEn: "Education",
    labelFr: "Éducation",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "nonprofit_event",
    labelEn: "Nonprofit / Event",
    labelFr: "Associatif / Événementiel",
    restrictedIn: [],
    blockedIn: [],
  },
  // ── Restricted in specific cities ─────────────────────────────────────────
  {
    id: "beverage_alcohol",
    labelEn: "Alcohol / Beer / Wine",
    labelFr: "Alcool / Bière / Vin",
    restrictedIn: [
      "new-york-ny",
      "chicago-il",
      "los-angeles-ca",
      "boston-ma",
      "philadelphia-pa",
      "san-francisco-ca",
      "seattle-wa",
    ],
    blockedIn: [],
    disclaimer:
      "Alcohol advertising near schools, places of worship, or parks is prohibited in most US cities " +
      "(typically within 500 ft). MoveSpot will automatically exclude sensitive zones from the route. " +
      "The advertiser remains solely responsible for verifying local ABC and municipal ordinance compliance before campaign launch.",
    frRestricted: true,
    frDisclaimer:
      "La publicité pour l'alcool est encadrée par la Loi Évin (art. L.3323-2 CSP). " +
      "Elle est interdite dans un rayon de 100 m des établissements scolaires, des équipements sportifs " +
      "et des lieux accueillant des mineurs. MoveSpot exclura automatiquement ces zones de l'itinéraire. " +
      "L'annonceur reste responsable du respect de la réglementation applicable à son secteur.",
  },
  {
    id: "financial_services",
    labelEn: "Financial Services / Crypto",
    labelFr: "Services financiers / Crypto",
    restrictedIn: ["new-york-ny", "los-angeles-ca", "chicago-il", "boston-ma"],
    blockedIn: [],
    disclaimer:
      "Financial advertising must comply with SEC, FINRA Rule 2210, and applicable state investment adviser regulations. " +
      "All performance claims must be accurate, balanced, and not misleading. Crypto assets may be subject to additional state disclosure requirements.",
    frRestricted: true,
    frDisclaimer:
      "La publicité pour les services financiers doit respecter la doctrine AMF et l'article L.533-12 du Code monétaire. " +
      "Toute allégation de performance doit être exacte, équilibrée et non trompeuse. " +
      "La publicité pour les actifs crypto doit inclure la mention obligatoire « Investir comporte des risques de perte en capital. »",
  },
  {
    id: "pharma_medical",
    labelEn: "Pharma / Medical Devices",
    labelFr: "Pharmacie / Dispositifs médicaux",
    restrictedIn: ["new-york-ny", "los-angeles-ca", "chicago-il", "san-francisco-ca", "boston-ma"],
    blockedIn: [],
    disclaimer:
      "Prescription drug advertising must comply with FDA 21 CFR Part 202, including the mandatory brief summary " +
      "of side effects and contraindications. OTC drug and medical device claims must not be false or misleading (FTC Act §5). " +
      "A regulatory review by a qualified specialist is strongly recommended before launch.",
    frBlocked: true,
    frDisclaimer:
      "La publicité pour les médicaments soumis à prescription est interdite auprès du grand public en France " +
      "(art. L.5122-6 CSP). Seuls les médicaments sans ordonnance peuvent faire l'objet d'une communication publique, " +
      "sous réserve d'un visa publicitaire ANSM. MoveSpot ne peut pas accepter ce brief pour le marché français.",
  },
];

export type ContentComplianceResult =
  | { status: "ok" }
  | { status: "restricted"; disclaimer: string }
  | { status: "blocked"; reason: string };

export function checkFrContentCompliance(categoryId: string): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };
  if (cat.frBlocked) {
    return {
      status: "blocked",
      reason: cat.frDisclaimer ?? `La catégorie « ${cat.labelFr} » n'est pas acceptée pour le marché français.`,
    };
  }
  if (cat.frRestricted && cat.frDisclaimer) {
    return { status: "restricted", disclaimer: cat.frDisclaimer };
  }
  return { status: "ok" };
}

export function checkContentCompliance(
  categoryId: string,
  cityId: string,
): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };

  if (cat.blockedIn.includes(cityId)) {
    return {
      status: "blocked",
      reason:
        `La catégorie « ${cat.labelFr} » n'est pas autorisée pour la publicité mobile dans cette ville. ` +
        `Choisissez une autre catégorie ou contactez MoveSpot pour étudier votre cas.`,
    };
  }

  if (cat.restrictedIn.includes(cityId) && cat.disclaimer) {
    return { status: "restricted", disclaimer: cat.disclaimer };
  }

  return { status: "ok" };
}
