// Content categories and their US market restrictions for mobile fleet advertising.
// Used to gate brief submission and surface jurisdiction-specific warnings.
//
// Application-level refusals (globallyBlocked: true) — blocked regardless of city:
//   Cannabis:  MoveSpot policy + federal Schedule I classification.
//   Tobacco/vaping: MoveSpot policy + FDA FSPTCA advertising restrictions.
//   Gambling:  MoveSpot policy + too complex a regulatory patchwork to handle safely.
//
// City-level restrictions:
//   Alcohol:   FTC/TTB rules; state ABC laws; 500 ft buffer from schools/churches (most states).
//   Pharma:    FDA 21 CFR Part 202; mandatory brief summary for Rx drugs.
//   Financial: SEC/FINRA Rule 2210; state-level investment adviser restrictions.

export type ContentCategory = {
  id: string;
  labelEn: string;
  labelFr: string;
  // Blocked at the application level regardless of city (MoveSpot policy refusal).
  globallyBlocked?: boolean;
  globalBlockReason?: string;
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
  // ── Globally blocked — MoveSpot application-level refusal ────────────────
  {
    id: "cannabis_cbd",
    labelEn: "Cannabis / CBD",
    labelFr: "Cannabis / CBD",
    globallyBlocked: true,
    globalBlockReason:
      "MoveSpot n'accepte pas les campagnes cannabis / CBD. " +
      "Le cannabis reste une substance classée Schedule I par la loi fédérale américaine, " +
      "et la réglementation OOH varie trop radicalement d'un État à l'autre pour être gérée de façon sécurisée sur notre plateforme.",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "tobacco_vaping",
    labelEn: "Tobacco / Vaping / E-cigarettes",
    labelFr: "Tabac / Vapotage / E-cigarettes",
    globallyBlocked: true,
    globalBlockReason:
      "MoveSpot n'accepte pas les campagnes tabac, cigarettes électroniques ou produits de vapotage. " +
      "Ces catégories font l'objet d'interdictions OOH dans de nombreuses villes et sont soumises à la loi " +
      "fédérale FDA FSPTCA, dont la complexité dépasse le cadre de notre offre actuelle.",
    restrictedIn: [],
    blockedIn: [],
  },
  {
    id: "gambling_betting",
    labelEn: "Gambling / Sports Betting",
    labelFr: "Jeux / Paris sportifs",
    globallyBlocked: true,
    globalBlockReason:
      "MoveSpot n'accepte pas les campagnes jeux d'argent et paris sportifs. " +
      "La réglementation est gérée État par État par les Gaming Control Boards et nécessite " +
      "des licences publicitaires spécifiques que MoveSpot n'est pas en mesure de vérifier à ce stade.",
    restrictedIn: [],
    blockedIn: [],
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

  if (cat.globallyBlocked) {
    return {
      status: "blocked",
      reason: cat.globalBlockReason ?? `La catégorie « ${cat.labelFr} » n'est pas acceptée sur MoveSpot.`,
    };
  }

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
