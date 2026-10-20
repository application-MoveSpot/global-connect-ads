// Regulatory status of Asian cities for mobile fleet advertising (vehicle wrapping).
// Regulatory environment varies dramatically across Asia — from highly permissive (Japan,
// South Korea, Hong Kong) to tightly controlled (China, Vietnam) and culturally restricted
// (Gulf states for alcohol).
//
// "open"         — general national advertising law applies.
// "restreint"    — additional local/national permit, cultural, or government-approval requirement.
// "zone_protegee"— protected heritage area or extremely restrictive advertising environment.
//
// alcoholRestricted: alcohol advertising is legally restricted (Muslim-majority law,
//   or only permitted in licensed premises/tourism contexts — not allowed for wide audience).
// alcoholBlocked: alcohol advertising is prohibited by national law.

export type AsMarketStatus = "open" | "restreint" | "zone_protegee";

export type AsCity = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  status: AsMarketStatus;
  notes?: string;
  alcoholRestricted?: boolean;
  alcoholBlocked?: boolean;
};

export const AS_CITIES: AsCity[] = [
  // ── Japon ─────────────────────────────────────────────────────────────────
  {
    id: "tokyo-jp",
    name: "Tokyo",
    countryCode: "JP",
    countryName: "Japon",
    countryFlag: "🇯🇵",
    status: "open",
    notes:
      "Marché publicitaire très mature. La publicité mobile sur véhicule est bien établie (wrapping de taxis en particulier). " +
      "Régi par le Japan Advertising Review Organization (JARO). Campagnes en japonais recommandées.",
  },
  {
    id: "osaka-jp",
    name: "Osaka",
    countryCode: "JP",
    countryName: "Japon",
    countryFlag: "🇯🇵",
    status: "open",
    notes: "2e pôle économique du Japon. Marché publicitaire dynamique, JARO applicable.",
  },
  // ── Corée du Sud ──────────────────────────────────────────────────────────
  {
    id: "seoul-kr",
    name: "Séoul",
    countryCode: "KR",
    countryName: "Corée du Sud",
    countryFlag: "🇰🇷",
    status: "open",
    notes:
      "Hub technologique et créatif. Publicité mobile sur véhicule très développée. " +
      "Régi par la Korea Advertising Self-Regulatory Organization (KASRO).",
  },
  // ── Singapour ─────────────────────────────────────────────────────────────
  {
    id: "singapore-sg",
    name: "Singapour",
    countryCode: "SG",
    countryName: "Singapour",
    countryFlag: "🇸🇬",
    status: "restreint",
    notes:
      "Régi par l'IMDA (Infocomm Media Development Authority) et l'Advertising Standards Authority of Singapore (ASAS). " +
      "Normes très strictes sur le contenu : pas de tromperie, respect des sensibilités multiculturelles (chinois, malais, indiens). " +
      "Publicité mobile autorisée mais contenu soumis à validation ASAS.",
  },
  // ── Hong Kong ─────────────────────────────────────────────────────────────
  {
    id: "hong-kong-hk",
    name: "Hong Kong",
    countryCode: "HK",
    countryName: "Hong Kong",
    countryFlag: "🇭🇰",
    status: "open",
    notes:
      "Marché publicitaire ouvert, régime commun law. Publicité mobile très active (wrapping de taxis). " +
      "Régi par l'Advertising Standards Authority (ASA HK).",
  },
  // ── Chine ─────────────────────────────────────────────────────────────────
  {
    id: "shanghai-cn",
    name: "Shanghai",
    countryCode: "CN",
    countryName: "Chine",
    countryFlag: "🇨🇳",
    status: "restreint",
    notes:
      "La publicité extérieure est réglementée par la SAMR (State Administration for Market Regulation) " +
      "et les autorités municipales. Approbation gouvernementale requise pour tout support publicitaire. " +
      "Le contenu ne peut pas contrevenir aux valeurs socialistes fondamentales. Partenariat local fortement conseillé.",
  },
  {
    id: "beijing-cn",
    name: "Pékin",
    countryCode: "CN",
    countryName: "Chine",
    countryFlag: "🇨🇳",
    status: "restreint",
    notes:
      "Capitale politique — réglementation publicitaire encore plus stricte qu'à Shanghai. " +
      "Approbation de la SAMR et des autorités de district requise. Contenu étranger soumis à révision.",
  },
  {
    id: "guangzhou-cn",
    name: "Guangzhou",
    countryCode: "CN",
    countryName: "Chine",
    countryFlag: "🇨🇳",
    status: "restreint",
    notes:
      "3e pôle économique. Mêmes règles SAMR qu'à Shanghai. Zone frontière avec Hong Kong — marché transfrontalier actif.",
  },
  // ── Inde ──────────────────────────────────────────────────────────────────
  {
    id: "mumbai-in",
    name: "Mumbai",
    countryCode: "IN",
    countryName: "Inde",
    countryFlag: "🇮🇳",
    status: "open",
    notes:
      "Plus grand marché publicitaire indien. Publicité mobile en forte croissance (wrapping de rickshaws, taxis et bus). " +
      "Régi par l'ASCI (Advertising Standards Council of India). Campagnes en hindi et en anglais.",
  },
  {
    id: "delhi-in",
    name: "Delhi",
    countryCode: "IN",
    countryName: "Inde",
    countryFlag: "🇮🇳",
    status: "restreint",
    notes:
      "La High Court de Delhi a imposé des restrictions sur la publicité mobile jugée distrayante pour les conducteurs. " +
      "Covering de véhicule utilitaire autorisé. Vérifier les règles municipales avant déploiement.",
  },
  {
    id: "bangalore-in",
    name: "Bengaluru",
    countryCode: "IN",
    countryName: "Inde",
    countryFlag: "🇮🇳",
    status: "open",
    notes: "Hub technologique indien. Marché start-up dynamique. ASCI applicable.",
  },
  // ── Thaïlande ─────────────────────────────────────────────────────────────
  {
    id: "bangkok-th",
    name: "Bangkok",
    countryCode: "TH",
    countryName: "Thaïlande",
    countryFlag: "🇹🇭",
    status: "restreint",
    alcoholRestricted: true,
    notes:
      "Publicité mobile active (wrapping de tuk-tuks et taxis). Régi par le Consumer Protection Act et la NBTC. " +
      "La publicité pour l'alcool est très réglementée (loi sur le contrôle des boissons alcoolisées B.E. 2551) : " +
      "interdite à proximité des temples, des écoles et sur les supports visant les mineurs. " +
      "Sensibilité culturelle bouddhiste à respecter dans les créations.",
  },
  // ── Vietnam ───────────────────────────────────────────────────────────────
  {
    id: "ho-chi-minh-vn",
    name: "Hô Chi Minh-Ville",
    countryCode: "VN",
    countryName: "Vietnam",
    countryFlag: "🇻🇳",
    status: "restreint",
    notes:
      "Régi par le décret n° 181/2013/ND-CP sur la publicité. Approbation des autorités locales (DOIT) requise " +
      "pour toute publicité extérieure. Contenu en langue vietnamienne exigé (le français/anglais peut être secondaire). " +
      "Partenaire local fortement recommandé.",
  },
  {
    id: "hanoi-vn",
    name: "Hanoï",
    countryCode: "VN",
    countryName: "Vietnam",
    countryFlag: "🇻🇳",
    status: "restreint",
    notes:
      "Capitale politique — réglementation publicitaire plus stricte qu'à Hô Chi Minh-Ville. Approbation du DOIT de Hanoï requise.",
  },
  // ── Malaisie ──────────────────────────────────────────────────────────────
  {
    id: "kuala-lumpur-my",
    name: "Kuala Lumpur",
    countryCode: "MY",
    countryName: "Malaisie",
    countryFlag: "🇲🇾",
    status: "restreint",
    alcoholRestricted: true,
    notes:
      "Régi par l'Advertising Standards Authority Malaysia (ASAM). Publicité mobile autorisée. " +
      "Pays à majorité musulmane : la publicité pour l'alcool ne peut pas cibler les musulmans " +
      "et doit comporter la mention obligatoire du ministère de la Santé sur la consommation responsable. " +
      "Sensibilités multiculturelles (malais, chinois, indiens) à respecter.",
  },
  // ── Émirats arabes unis ───────────────────────────────────────────────────
  {
    id: "dubai-ae",
    name: "Dubaï",
    countryCode: "AE",
    countryName: "Émirats arabes unis",
    countryFlag: "🇦🇪",
    status: "restreint",
    alcoholRestricted: true,
    notes:
      "Régi par le National Media Council (NMC/UAE) — approbation requise pour tout support publicitaire. " +
      "La publicité pour l'alcool est autorisée uniquement dans les établissements sous licence " +
      "(hôtels 5*, duty-free, restaurants agréés) et ne peut pas être diffusée vers le grand public. " +
      "Covering de véhicule très développé pour le B2B et le luxe. Contenu mixte : anglais + arabe conseillé.",
  },
  {
    id: "abu-dhabi-ae",
    name: "Abu Dhabi",
    countryCode: "AE",
    countryName: "Émirats arabes unis",
    countryFlag: "🇦🇪",
    status: "restreint",
    alcoholRestricted: true,
    notes:
      "Capitale fédérale. Mêmes règles NMC qu'à Dubaï, application plus stricte. " +
      "Présence de nombreuses institutions gouvernementales — éviter les zones officielles pour le déploiement.",
  },
];

export function findAsCity(id: string): AsCity | undefined {
  return AS_CITIES.find((c) => c.id === id);
}

export function getAsCitiesByCountry(): Map<string, AsCity[]> {
  const map = new Map<string, AsCity[]>();
  for (const city of AS_CITIES) {
    const key = `${city.countryFlag} ${city.countryName}`;
    const existing = map.get(key) ?? [];
    existing.push(city);
    map.set(key, existing);
  }
  return map;
}
