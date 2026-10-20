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
  // EU: restriction applies across EU member states (+ CH/GB).
  euRestricted?: boolean;
  // EU: category not accepted at all in EU markets.
  euBlocked?: boolean;
  // Shown to the advertiser when EU restriction applies.
  euDisclaimer?: string;
  // Africa: continent-level restriction (applies regardless of city).
  afRestricted?: boolean;
  // Africa: category not accepted at all in African markets.
  afBlocked?: boolean;
  // Shown to the advertiser for African markets.
  afDisclaimer?: string;
  // Asia: continent-level restriction (applies regardless of city).
  asRestricted?: boolean;
  // Asia: category not accepted at all in Asian markets.
  asBlocked?: boolean;
  // Shown to the advertiser for Asian markets.
  asDisclaimer?: string;
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
    afRestricted: true,
    afDisclaimer:
      "La publicité pour l'alcool est strictement encadrée dans de nombreux pays africains, en particulier " +
      "au Maghreb, au Sahel et dans les pays à majorité musulmane. Dans certains marchés (Algérie), elle est totalement interdite. " +
      "MoveSpot appliquera les règles locales de la flotte partenaire. Vérifiez la législation nationale avant lancement.",
    asRestricted: true,
    asDisclaimer:
      "La publicité pour l'alcool est soumise à des restrictions importantes dans de nombreux pays asiatiques. " +
      "Dans les marchés du Golfe (EAU, Arabie saoudite), elle est interdite au grand public et limitée aux établissements sous licence. " +
      "En Thaïlande et Malaisie, elle ne peut pas cibler les mineurs ni être diffusée près de temples ou d'écoles. " +
      "MoveSpot appliquera les règles locales. Vérifiez la loi nationale du marché ciblé avant lancement.",
    euRestricted: true,
    euDisclaimer:
      "La publicité pour les boissons alcoolisées est soumise aux lois nationales de chaque pays européen. " +
      "Certains pays (Suède, Finlande, Norvège) ont des restrictions très strictes équivalentes à la Loi Évin française. " +
      "En Allemagne, Espagne, Italie et Belgique, la publicité est autorisée mais ne doit pas cibler les mineurs (ARPP européen). " +
      "L'annonceur est seul responsable du respect des lois nationales applicables dans le marché ciblé.",
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
    afRestricted: true,
    afDisclaimer:
      "La publicité pour les services financiers est encadrée par les régulateurs nationaux africains " +
      "(CREPMF/UEMOA, COBAC/CEMAC, FSCA en Afrique du Sud, etc.). Toute allégation de performance doit être exacte. " +
      "La publicité pour les crypto-actifs est soumise à approbation dans la plupart des pays africains — vérifiez auprès du régulateur local.",
    asRestricted: true,
    asDisclaimer:
      "La publicité pour les services financiers est encadrée par les régulateurs nationaux asiatiques " +
      "(MAS à Singapour, FSC en Corée, SEBI en Inde, NMC aux EAU, SAMR en Chine…). " +
      "La publicité pour les crypto-actifs nécessite une approbation préalable dans la plupart des pays. " +
      "Vérifiez les exigences du régulateur compétent du marché ciblé avant tout lancement.",
    euRestricted: true,
    euDisclaimer:
      "La publicité pour les services financiers est encadrée par MiFID II et les régulateurs nationaux (BaFin, FCA, CNMV, AFM…). " +
      "Toute allégation de performance doit être exacte, équilibrée et non trompeuse. " +
      "La publicité pour les crypto-actifs est soumise au règlement MiCA (UE 2023/1114) : mention obligatoire du risque de perte en capital. " +
      "L'annonceur doit vérifier les exigences locales auprès du régulateur compétent du marché ciblé.",
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
    afBlocked: true,
    afDisclaimer:
      "La publicité pour les médicaments soumis à prescription est interdite auprès du grand public dans la quasi-totalité des pays africains. " +
      "Seuls les médicaments sans ordonnance, autorisés par l'autorité nationale de santé compétente, peuvent faire l'objet d'une publicité. " +
      "MoveSpot ne peut pas accepter ce brief pour les marchés africains.",
    asBlocked: true,
    asDisclaimer:
      "La publicité pour les médicaments soumis à prescription est interdite auprès du grand public dans la quasi-totalité des pays asiatiques. " +
      "Les règles varient pour les dispositifs médicaux — vérifiez l'autorisation de l'agence nationale compétente (PMDA au Japon, CDSCO en Inde, HSA à Singapour…). " +
      "MoveSpot ne peut pas accepter ce brief pour les marchés asiatiques.",
    euBlocked: true,
    euDisclaimer:
      "La publicité pour les médicaments soumis à prescription est interdite auprès du grand public dans toute l'Union européenne " +
      "(Directive 2001/83/CE, art. 88). Seuls les médicaments sans ordonnance peuvent faire l'objet d'une publicité grand public, " +
      "sous réserve d'une autorisation nationale. MoveSpot ne peut pas accepter ce brief pour les marchés européens.",
  },
];

export type ContentComplianceResult =
  | { status: "ok" }
  | { status: "restricted"; disclaimer: string }
  | { status: "blocked"; reason: string };

export function checkEuContentCompliance(categoryId: string): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };
  if (cat.euBlocked) {
    return {
      status: "blocked",
      reason:
        cat.euDisclaimer ??
        `La catégorie « ${cat.labelFr} » n'est pas acceptée pour les marchés européens.`,
    };
  }
  if (cat.euRestricted && cat.euDisclaimer) {
    return { status: "restricted", disclaimer: cat.euDisclaimer };
  }
  return { status: "ok" };
}

/** Africa compliance — pass alcoholBlocked/alcoholRestricted from the city for alcohol override. */
export function checkAfContentCompliance(
  categoryId: string,
  cityAlcohol?: { blocked?: boolean; restricted?: boolean },
): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };
  if (cat.afBlocked) {
    return {
      status: "blocked",
      reason:
        cat.afDisclaimer ??
        `La catégorie « ${cat.labelFr} » n'est pas acceptée pour les marchés africains.`,
    };
  }
  // City-level alcohol override
  if (cat.id === "beverage_alcohol" && cityAlcohol?.blocked) {
    return {
      status: "blocked",
      reason:
        "La publicité pour l'alcool est totalement interdite dans ce marché (loi nationale). " +
        "MoveSpot ne peut pas accepter ce brief pour cette ville.",
    };
  }
  if (cat.id === "beverage_alcohol" && cityAlcohol?.restricted) {
    return {
      status: "restricted",
      disclaimer:
        cat.afDisclaimer ??
        "La publicité pour l'alcool est soumise à des restrictions locales dans ce marché. " +
          "MoveSpot appliquera les règles de la flotte partenaire.",
    };
  }
  if (cat.afRestricted && cat.afDisclaimer) {
    return { status: "restricted", disclaimer: cat.afDisclaimer };
  }
  return { status: "ok" };
}

/** Asia compliance — pass alcoholBlocked/alcoholRestricted from the city for alcohol override. */
export function checkAsContentCompliance(
  categoryId: string,
  cityAlcohol?: { blocked?: boolean; restricted?: boolean },
): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };
  if (cat.asBlocked) {
    return {
      status: "blocked",
      reason:
        cat.asDisclaimer ??
        `La catégorie « ${cat.labelFr} » n'est pas acceptée pour les marchés asiatiques.`,
    };
  }
  if (cat.id === "beverage_alcohol" && cityAlcohol?.blocked) {
    return {
      status: "blocked",
      reason:
        "La publicité pour l'alcool est totalement interdite dans ce marché (loi nationale). " +
        "MoveSpot ne peut pas accepter ce brief pour cette ville.",
    };
  }
  if (cat.id === "beverage_alcohol" && cityAlcohol?.restricted) {
    return {
      status: "restricted",
      disclaimer:
        cat.asDisclaimer ??
        "La publicité pour l'alcool est soumise à des restrictions importantes dans ce marché. " +
          "MoveSpot appliquera les règles locales de la flotte partenaire.",
    };
  }
  if (cat.asRestricted && cat.asDisclaimer) {
    return { status: "restricted", disclaimer: cat.asDisclaimer };
  }
  return { status: "ok" };
}

export function checkFrContentCompliance(categoryId: string): ContentComplianceResult {
  const cat = CONTENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return { status: "ok" };
  if (cat.frBlocked) {
    return {
      status: "blocked",
      reason:
        cat.frDisclaimer ??
        `La catégorie « ${cat.labelFr} » n'est pas acceptée pour le marché français.`,
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
