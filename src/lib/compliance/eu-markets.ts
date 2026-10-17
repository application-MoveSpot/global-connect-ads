// Regulatory status of European cities for mobile fleet advertising (vehicle wrapping).
// EU framework: Directive 2001/83/EC (pharma), MiFID II + MiCA (financial/crypto),
// GDPR (data-driven targeting), national outdoor advertising laws.
//
// "open"         — standard national advertising law applies; no specific local restriction.
// "restreint"    — additional local/national permit or restriction in force.
// "zone_protegee"— UNESCO / heritage zone: very restrictive; itineraries must avoid the perimeter.
//
// Switzerland and UK are non-EU but included as key adjacent markets.

export type EuMarketStatus = "open" | "restreint" | "zone_protegee";

export type EuCity = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  status: EuMarketStatus;
  notes?: string;
};

export const EU_CITIES: EuCity[] = [
  // ── Allemagne ─────────────────────────────────────────────────────────────
  {
    id: "berlin-de",
    name: "Berlin",
    countryCode: "DE",
    countryName: "Allemagne",
    countryFlag: "🇩🇪",
    status: "open",
    notes: "Publicité mobile sur véhicule autorisée. La loi fédérale sur la publicité extérieure (Straßenverkehrsgesetz) s'applique.",
  },
  {
    id: "munich-de",
    name: "Munich",
    countryCode: "DE",
    countryName: "Allemagne",
    countryFlag: "🇩🇪",
    status: "open",
  },
  {
    id: "hamburg-de",
    name: "Hambourg",
    countryCode: "DE",
    countryName: "Allemagne",
    countryFlag: "🇩🇪",
    status: "open",
  },
  {
    id: "frankfurt-de",
    name: "Francfort",
    countryCode: "DE",
    countryName: "Allemagne",
    countryFlag: "🇩🇪",
    status: "open",
  },
  {
    id: "cologne-de",
    name: "Cologne",
    countryCode: "DE",
    countryName: "Allemagne",
    countryFlag: "🇩🇪",
    status: "open",
  },
  // ── Espagne ───────────────────────────────────────────────────────────────
  {
    id: "madrid-es",
    name: "Madrid",
    countryCode: "ES",
    countryName: "Espagne",
    countryFlag: "🇪🇸",
    status: "open",
  },
  {
    id: "barcelona-es",
    name: "Barcelone",
    countryCode: "ES",
    countryName: "Espagne",
    countryFlag: "🇪🇸",
    status: "restreint",
    notes:
      "Réglementation municipale renforcée dans les zones touristiques (Barceloneta, Gòtic). " +
      "Autorisation préalable recommandée auprès de l'Ajuntament de Barcelona.",
  },
  {
    id: "seville-es",
    name: "Séville",
    countryCode: "ES",
    countryName: "Espagne",
    countryFlag: "🇪🇸",
    status: "open",
  },
  {
    id: "valencia-es",
    name: "Valence",
    countryCode: "ES",
    countryName: "Espagne",
    countryFlag: "🇪🇸",
    status: "open",
  },
  // ── Italie ────────────────────────────────────────────────────────────────
  {
    id: "milan-it",
    name: "Milan",
    countryCode: "IT",
    countryName: "Italie",
    countryFlag: "🇮🇹",
    status: "open",
  },
  {
    id: "rome-it",
    name: "Rome",
    countryCode: "IT",
    countryName: "Italie",
    countryFlag: "🇮🇹",
    status: "restreint",
    notes:
      "Réglementation stricte dans le centre historique (Centro Storico, classé UNESCO). " +
      "Publicité mobile sur véhicule utilitaire autorisée en dehors du périmètre classé. " +
      "Déclaration préalable exigée auprès du Comune di Roma.",
  },
  {
    id: "turin-it",
    name: "Turin",
    countryCode: "IT",
    countryName: "Italie",
    countryFlag: "🇮🇹",
    status: "open",
  },
  {
    id: "naples-it",
    name: "Naples",
    countryCode: "IT",
    countryName: "Italie",
    countryFlag: "🇮🇹",
    status: "open",
  },
  // ── Belgique ──────────────────────────────────────────────────────────────
  {
    id: "brussels-be",
    name: "Bruxelles",
    countryCode: "BE",
    countryName: "Belgique",
    countryFlag: "🇧🇪",
    status: "restreint",
    notes:
      "Réglementation bruxelloise spécifique (ordonnance du 22 nov. 2018 sur la publicité extérieure). " +
      "Exigences bilingues (FR/NL) pour certains formats. Permis d'environnement requis pour publicité itinérante.",
  },
  {
    id: "antwerp-be",
    name: "Anvers",
    countryCode: "BE",
    countryName: "Belgique",
    countryFlag: "🇧🇪",
    status: "open",
  },
  {
    id: "liege-be",
    name: "Liège",
    countryCode: "BE",
    countryName: "Belgique",
    countryFlag: "🇧🇪",
    status: "open",
  },
  // ── Pays-Bas ──────────────────────────────────────────────────────────────
  {
    id: "amsterdam-nl",
    name: "Amsterdam",
    countryCode: "NL",
    countryName: "Pays-Bas",
    countryFlag: "🇳🇱",
    status: "restreint",
    notes:
      "Centre historique classé UNESCO. La gemeente Amsterdam impose des restrictions à la publicité mobile " +
      "dans le cœur historique (Grachtengordel). Vehicles en covering circulant pour leur activité sont admis.",
  },
  {
    id: "rotterdam-nl",
    name: "Rotterdam",
    countryCode: "NL",
    countryName: "Pays-Bas",
    countryFlag: "🇳🇱",
    status: "open",
  },
  {
    id: "the-hague-nl",
    name: "La Haye",
    countryCode: "NL",
    countryName: "Pays-Bas",
    countryFlag: "🇳🇱",
    status: "open",
  },
  // ── Portugal ──────────────────────────────────────────────────────────────
  {
    id: "lisbon-pt",
    name: "Lisbonne",
    countryCode: "PT",
    countryName: "Portugal",
    countryFlag: "🇵🇹",
    status: "open",
  },
  {
    id: "porto-pt",
    name: "Porto",
    countryCode: "PT",
    countryName: "Portugal",
    countryFlag: "🇵🇹",
    status: "open",
    notes: "Centre historique classé UNESCO — éviter le périmètre du Ribeira pour le déploiement.",
  },
  // ── Pologne ───────────────────────────────────────────────────────────────
  {
    id: "warsaw-pl",
    name: "Varsovie",
    countryCode: "PL",
    countryName: "Pologne",
    countryFlag: "🇵🇱",
    status: "open",
  },
  {
    id: "krakow-pl",
    name: "Cracovie",
    countryCode: "PL",
    countryName: "Pologne",
    countryFlag: "🇵🇱",
    status: "zone_protegee",
    notes:
      "Centre historique classé UNESCO (Stare Miasto). Publicité mobile très encadrée dans le périmètre classé. " +
      "Consulter l'Urząd Miasta Krakowa avant tout déploiement.",
  },
  // ── Autriche ──────────────────────────────────────────────────────────────
  {
    id: "vienna-at",
    name: "Vienne",
    countryCode: "AT",
    countryName: "Autriche",
    countryFlag: "🇦🇹",
    status: "restreint",
    notes:
      "Centre historique classé UNESCO (Innere Stadt). Réglementation autrichienne sur la publicité extérieure " +
      "(Bundesstraßengesetz + règlement viennois). Permis requis pour les véhicules publicitaires dédiés.",
  },
  // ── Luxembourg ────────────────────────────────────────────────────────────
  {
    id: "luxembourg-lu",
    name: "Luxembourg-Ville",
    countryCode: "LU",
    countryName: "Luxembourg",
    countryFlag: "🇱🇺",
    status: "open",
    notes: "Centre historique classé UNESCO — itinéraires à planifier hors périmètre protégé.",
  },
  // ── Suisse (hors UE) ──────────────────────────────────────────────────────
  {
    id: "zurich-ch",
    name: "Zurich",
    countryCode: "CH",
    countryName: "Suisse",
    countryFlag: "🇨🇭",
    status: "restreint",
    notes:
      "Hors UE (AELE). Réglementation cantonale zurichoise sur la publicité extérieure. " +
      "Autorisation de la ville requise pour véhicules publicitaires circulants. Loi fédérale sur la circulation routière (LCR) applicable.",
  },
  {
    id: "geneva-ch",
    name: "Genève",
    countryCode: "CH",
    countryName: "Suisse",
    countryFlag: "🇨🇭",
    status: "restreint",
    notes:
      "Hors UE (AELE). Canton de Genève : réglementation stricte sur la publicité mobile (loi cantonale sur les routes). " +
      "Permis spécifique exigé. Idéal pour campagnes transfrontalières France–Suisse.",
  },
  // ── Royaume-Uni (hors UE post-Brexit) ─────────────────────────────────────
  {
    id: "london-gb",
    name: "Londres",
    countryCode: "GB",
    countryName: "Royaume-Uni",
    countryFlag: "🇬🇧",
    status: "restreint",
    notes:
      "Hors UE (post-Brexit). Réglementation ASA (Advertising Standards Authority) + règles TfL pour la publicité " +
      "dans le Grand Londres. Covering de véhicule autorisé ; véhicules dédiés soumis à permis borough.",
  },
  {
    id: "manchester-gb",
    name: "Manchester",
    countryCode: "GB",
    countryName: "Royaume-Uni",
    countryFlag: "🇬🇧",
    status: "open",
    notes: "Hors UE (post-Brexit). Réglementation ASA applicable.",
  },
];

export function findEuCity(id: string): EuCity | undefined {
  return EU_CITIES.find((c) => c.id === id);
}

export function getEuCitiesByCountry(): Map<string, EuCity[]> {
  const map = new Map<string, EuCity[]>();
  for (const city of EU_CITIES) {
    const key = `${city.countryFlag} ${city.countryName}`;
    const existing = map.get(key) ?? [];
    existing.push(city);
    map.set(key, existing);
  }
  return map;
}
