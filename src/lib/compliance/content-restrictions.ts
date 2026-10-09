// Content categories and their US market restrictions for mobile fleet advertising.
// Used to gate brief submission and surface jurisdiction-specific warnings.
//
// NOT listed here (outside MoveSpot's scope entirely — not accepted, not shown):
//   Cannabis / CBD, Tobacco / Vaping, Gambling / Sports Betting.
//   These are handled as forbidden keywords in forbidden-keywords.ts.
//
// City-level restrictions for accepted categories:
//   Alcohol:   FTC/TTB rules; state ABC laws; 500 ft buffer from schools/churches (most states).
//   Pharma:    FDA 21 CFR Part 202; mandatory brief summary for Rx drugs.
//   Financial: SEC/FINRA Rule 2210; state-level investment adviser restrictions.

export type ContentCategory = {
  id: string;
  labelEn: string;
  labelFr: string;
  // Cities where this category requires a disclaimer (shown as ⚠ warning).
  restrictedIn: string[];
  // Cities where this category is entirely blocked (blocks submission).
  blockedIn: string[];
  // Shown to the advertiser when restriction applies (always in English for US market).
  disclaimer?: string;
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
  },
  {
    id: "financial_services",
    labelEn: "Financial Services / Crypto",
    labelFr: "Services financiers / Crypto",
    restrictedIn: [
      "new-york-ny",
      "los-angeles-ca",
      "chicago-il",
      "boston-ma",
    ],
    blockedIn: [],
    disclaimer:
      "Financial advertising must comply with SEC, FINRA Rule 2210, and applicable state investment adviser regulations. " +
      "All performance claims must be accurate, balanced, and not misleading. Crypto assets may be subject to additional state disclosure requirements.",
  },
  {
    id: "pharma_medical",
    labelEn: "Pharma / Medical Devices",
    labelFr: "Pharmacie / Dispositifs médicaux",
    restrictedIn: [
      "new-york-ny",
      "los-angeles-ca",
      "chicago-il",
      "san-francisco-ca",
      "boston-ma",
    ],
    blockedIn: [],
    disclaimer:
      "Prescription drug advertising must comply with FDA 21 CFR Part 202, including the mandatory brief summary " +
      "of side effects and contraindications. OTC drug and medical device claims must not be false or misleading (FTC Act §5). " +
      "A regulatory review by a qualified specialist is strongly recommended before launch.",
  },
];

export type ContentComplianceResult =
  | { status: "ok" }
  | { status: "restricted"; disclaimer: string }
  | { status: "blocked"; reason: string };

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
