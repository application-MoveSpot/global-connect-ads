// Regulatory status of African cities for mobile fleet advertising (vehicle wrapping).
// Frameworks vary significantly by country — French civil-law heritage in Francophone Africa,
// common law in Anglophone Africa, local codes in MENA.
//
// "open"         — general national advertising law applies; no specific local restriction.
// "restreint"    — additional local/national permit or cultural restriction in force.
// "zone_protegee"— UNESCO / heritage zone or very restrictive advertising environment.
//
// alcoholRestricted: advertising for alcohol is legally restricted in this market
//   (Muslim-majority or specific national law — allowed in licensed venues only or
//    requires special permit; must not target non-permissioned audiences).
// alcoholBlocked: advertising for alcohol is prohibited (national ban, e.g. Algeria).

export type AfMarketStatus = "open" | "restreint" | "zone_protegee";

export type AfCity = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  status: AfMarketStatus;
  notes?: string;
  alcoholRestricted?: boolean;
  alcoholBlocked?: boolean;
};

export const AF_CITIES: AfCity[] = [
  // ── Maroc ─────────────────────────────────────────────────────────────────
  {
    id: "casablanca-ma",
    name: "Casablanca",
    countryCode: "MA",
    countryName: "Maroc",
    countryFlag: "🇲🇦",
    status: "open",
    alcoholRestricted: true,
    notes:
      "Publicité mobile sur véhicule autorisée. Régie par la loi n° 28-08 sur les pratiques commerciales. " +
      "La publicité pour l'alcool est encadrée (vente légale en épiceries agréées, mais communication très restreinte — " +
      "il est déconseillé de viser un public large ou de diffuser près des mosquées et des écoles).",
  },
  {
    id: "rabat-ma",
    name: "Rabat",
    countryCode: "MA",
    countryName: "Maroc",
    countryFlag: "🇲🇦",
    status: "open",
    alcoholRestricted: true,
    notes:
      "Capitale administrative. Mêmes règles qu'à Casablanca. Présence institutionnelle — éviter les zones gouvernementales.",
  },
  {
    id: "marrakech-ma",
    name: "Marrakech",
    countryCode: "MA",
    countryName: "Maroc",
    countryFlag: "🇲🇦",
    status: "restreint",
    alcoholRestricted: true,
    notes:
      "Médina classée UNESCO — publicité mobile déconseillée dans le périmètre historique (Djemaa el-Fna, souks). " +
      "Déploiement recommandé dans la Ville Nouvelle et Guéliz. Forte audience touristique internationale.",
  },
  {
    id: "tanger-ma",
    name: "Tanger",
    countryCode: "MA",
    countryName: "Maroc",
    countryFlag: "🇲🇦",
    status: "open",
    alcoholRestricted: true,
    notes:
      "Zone franche économique TFZ. Marché dynamique, bonne tolérance publicitaire en Ville Nouvelle.",
  },
  // ── Algérie ───────────────────────────────────────────────────────────────
  {
    id: "alger-dz",
    name: "Alger",
    countryCode: "DZ",
    countryName: "Algérie",
    countryFlag: "🇩🇿",
    status: "restreint",
    alcoholBlocked: true,
    notes:
      "Réglementation publicitaire encadrée par le CAIP (Conseil Algérien de la Publicité). " +
      "Autorisation préalable des services de wilaya requise pour les supports itinérants. " +
      "La publicité pour l'alcool est totalement interdite (pays à majorité musulmane, loi nationale).",
  },
  {
    id: "oran-dz",
    name: "Oran",
    countryCode: "DZ",
    countryName: "Algérie",
    countryFlag: "🇩🇿",
    status: "open",
    alcoholBlocked: true,
    notes: "2e ville économique. Mêmes règles qu'Alger. Alcool prohibé à la publicité.",
  },
  // ── Tunisie ───────────────────────────────────────────────────────────────
  {
    id: "tunis-tn",
    name: "Tunis",
    countryCode: "TN",
    countryName: "Tunisie",
    countryFlag: "🇹🇳",
    status: "open",
    alcoholRestricted: true,
    notes:
      "Régie par le décret n° 85-1280 et la Haute Autorité de la Communication Audiovisuelle (HAICA). " +
      "Publicité mobile autorisée. Alcool légal à la vente mais sa publicité doit rester discrète " +
      "et ne pas cibler les zones résidentielles ou religieuses. Médina de Tunis classée UNESCO — éviter le périmètre.",
  },
  {
    id: "sfax-tn",
    name: "Sfax",
    countryCode: "TN",
    countryName: "Tunisie",
    countryFlag: "🇹🇳",
    status: "open",
    alcoholRestricted: true,
    notes: "2e ville économique de Tunisie. Marché industriel et commercial actif.",
  },
  // ── Sénégal ───────────────────────────────────────────────────────────────
  {
    id: "dakar-sn",
    name: "Dakar",
    countryCode: "SN",
    countryName: "Sénégal",
    countryFlag: "🇸🇳",
    status: "open",
    alcoholRestricted: true,
    notes:
      "Hub économique ouest-africain francophone. Publicité mobile autorisée. " +
      "Pays à majorité musulmane — la publicité pour l'alcool est déconseillée voire refusée " +
      "par certains prestataires locaux. Vérifier la politique de la flotte partenaire avant lancement.",
  },
  // ── Côte d'Ivoire ─────────────────────────────────────────────────────────
  {
    id: "abidjan-ci",
    name: "Abidjan",
    countryCode: "CI",
    countryName: "Côte d'Ivoire",
    countryFlag: "🇨🇮",
    status: "open",
    notes:
      "1re place économique d'Afrique de l'Ouest francophone. Publicité mobile sur flotte active. " +
      "Régie par le Code ivoirien de la publicité (loi n° 2004-643). Marché ouvert, bonne tolérance publicitaire.",
  },
  {
    id: "yamoussoukro-ci",
    name: "Yamoussoukro",
    countryCode: "CI",
    countryName: "Côte d'Ivoire",
    countryFlag: "🇨🇮",
    status: "open",
    notes: "Capitale politique. Marché plus petit mais en développement.",
  },
  // ── Cameroun ──────────────────────────────────────────────────────────────
  {
    id: "douala-cm",
    name: "Douala",
    countryCode: "CM",
    countryName: "Cameroun",
    countryFlag: "🇨🇲",
    status: "open",
    notes:
      "Capitale économique du Cameroun, porte d'entrée de l'Afrique centrale. Publicité mobile active. " +
      "Réglementation publicitaire du Conseil National de la Communication (CNC).",
  },
  {
    id: "yaounde-cm",
    name: "Yaoundé",
    countryCode: "CM",
    countryName: "Cameroun",
    countryFlag: "🇨🇲",
    status: "open",
    notes: "Capitale politique et administrative. Marché institutionnel et B2B.",
  },
  // ── Afrique du Sud ────────────────────────────────────────────────────────
  {
    id: "johannesburg-za",
    name: "Johannesburg",
    countryCode: "ZA",
    countryName: "Afrique du Sud",
    countryFlag: "🇿🇦",
    status: "open",
    notes:
      "Plus grand marché publicitaire d'Afrique subsaharienne. Régie par l'ASA (Advertising Standards Authority of South Africa). " +
      "Covering de véhicule très développé. Campagnes en anglais ou en zoulou selon les zones.",
  },
  {
    id: "cape-town-za",
    name: "Le Cap",
    countryCode: "ZA",
    countryName: "Afrique du Sud",
    countryFlag: "🇿🇦",
    status: "open",
    notes: "Marché touristique et créatif. Publicité mobile active, ASA applicable.",
  },
  // ── Nigeria ───────────────────────────────────────────────────────────────
  {
    id: "lagos-ng",
    name: "Lagos",
    countryCode: "NG",
    countryName: "Nigéria",
    countryFlag: "🇳🇬",
    status: "restreint",
    notes:
      "Plus grande économie d'Afrique. Publicité extérieure régie par le Lagos State Signage and Advertisement Agency (LASAA) : " +
      "permis LASAA obligatoire pour tout support publicitaire itinérant. Processus d'approbation à anticiper (2–4 semaines).",
  },
  // ── Kenya ─────────────────────────────────────────────────────────────────
  {
    id: "nairobi-ke",
    name: "Nairobi",
    countryCode: "KE",
    countryName: "Kenya",
    countryFlag: "🇰🇪",
    status: "open",
    notes:
      "Hub technologique et économique d'Afrique de l'Est. Publicité mobile active. " +
      "Régie par le Kenyan Advertising Standards Committee (KASC). Marché anglophone dynamique.",
  },
  // ── Maurice ───────────────────────────────────────────────────────────────
  {
    id: "port-louis-mu",
    name: "Port-Louis",
    countryCode: "MU",
    countryName: "Maurice",
    countryFlag: "🇲🇺",
    status: "open",
    notes:
      "Place financière et touristique francophone. Publicité mobile autorisée. " +
      "Régie par le Broadcasting Authority of Mauritius. Marché bilingue français/anglais.",
  },
  // ── Madagascar ────────────────────────────────────────────────────────────
  {
    id: "antananarivo-mg",
    name: "Antananarivo",
    countryCode: "MG",
    countryName: "Madagascar",
    countryFlag: "🇲🇬",
    status: "open",
    notes:
      "Capitale malgache francophone. Publicité mobile émergente. " +
      "Infrastructure routière à prévoir dans le planning d'itinéraire.",
  },
];

export function findAfCity(id: string): AfCity | undefined {
  return AF_CITIES.find((c) => c.id === id);
}

export function getAfCitiesByCountry(): Map<string, AfCity[]> {
  const map = new Map<string, AfCity[]>();
  for (const city of AF_CITIES) {
    const key = `${city.countryFlag} ${city.countryName}`;
    const existing = map.get(key) ?? [];
    existing.push(city);
    map.set(key, existing);
  }
  return map;
}
