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
  isFrance?: boolean;
  isOutreMer?: boolean;
};

export const EU_CITIES: EuCity[] = [
  // ── France — Métropole ────────────────────────────────────────────────────
  { id: "bordeaux-33", name: "Bordeaux", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "toulouse-31", name: "Toulouse", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "nantes-44", name: "Nantes", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "rennes-35", name: "Rennes", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "lille-59", name: "Lille", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "montpellier-34", name: "Montpellier", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "strasbourg-67", name: "Strasbourg", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "grenoble-38", name: "Grenoble", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "nice-06", name: "Nice", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "marseille-13", name: "Marseille", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "tours-37", name: "Tours", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "dijon-21", name: "Dijon", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "reims-51", name: "Reims", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "le-havre-76", name: "Le Havre", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  { id: "caen-14", name: "Caen", countryCode: "FR", countryName: "France — Métropole", countryFlag: "🇫🇷", status: "open", isFrance: true },
  {
    id: "paris-75",
    name: "Paris",
    countryCode: "FR",
    countryName: "France — Métropole",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    notes:
      "Le RLP de Paris (2011, révisé 2024) interdit les véhicules publicitaires dédiés (camions-sandwichs) " +
      "dans les zones résidentielles et à proximité des écoles. Les véhicules en covering circulant pour leur " +
      "activité propre sont autorisés. Éviter le centre historique (Marais, Île de la Cité) lors du déploiement.",
  },
  {
    id: "lyon-69",
    name: "Lyon",
    countryCode: "FR",
    countryName: "France — Métropole",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    notes:
      "RLP métropolitain en vigueur. Publicité mobile sur véhicule utilitaire autorisée hors zones sensibles " +
      "(Vieux-Lyon, secteur sauvegardé 5e). Déclaration préalable conseillée auprès de la Métropole.",
  },
  {
    id: "versailles-78",
    name: "Versailles",
    countryCode: "FR",
    countryName: "France — Métropole",
    countryFlag: "🇫🇷",
    status: "zone_protegee",
    isFrance: true,
    notes:
      "Site classé UNESCO (Château et parc de Versailles). Toute publicité mobile est fortement déconseillée " +
      "dans le périmètre classé. Consultez l'ABF (Architecte des Bâtiments de France) avant lancement.",
  },
  {
    id: "avignon-84",
    name: "Avignon",
    countryCode: "FR",
    countryName: "France — Métropole",
    countryFlag: "🇫🇷",
    status: "zone_protegee",
    isFrance: true,
    notes:
      "Centre historique classé UNESCO (remparts et palais des Papes). Couverture de véhicule autorisée " +
      "hors du périmètre protégé. Vérifier les règles de l'AVAP avec la mairie avant déploiement.",
  },
  // ── France — Outre-mer (DROM) ─────────────────────────────────────────────
  {
    id: "guadeloupe-971",
    name: "Guadeloupe",
    countryCode: "FR",
    countryName: "France — Outre-mer (DROM)",
    countryFlag: "🇫🇷",
    status: "open",
    isFrance: true,
    isOutreMer: true,
    notes:
      "DROM — droit national français intégralement applicable (Loi Évin, décret 2012-118, ARPP). " +
      "Flotte disponible à Pointe-à-Pitre et Basse-Terre.",
  },
  {
    id: "martinique-972",
    name: "Martinique",
    countryCode: "FR",
    countryName: "France — Outre-mer (DROM)",
    countryFlag: "🇫🇷",
    status: "open",
    isFrance: true,
    isOutreMer: true,
    notes: "DROM — droit national français applicable. Marché actif à Fort-de-France et l'agglomération Centre.",
  },
  {
    id: "guyane-973",
    name: "Guyane",
    countryCode: "FR",
    countryName: "France — Outre-mer (DROM)",
    countryFlag: "🇫🇷",
    status: "open",
    isFrance: true,
    isOutreMer: true,
    notes: "DROM — droit national français applicable. Flotte disponible principalement à Cayenne et Saint-Laurent-du-Maroni.",
  },
  {
    id: "reunion-974",
    name: "La Réunion",
    countryCode: "FR",
    countryName: "France — Outre-mer (DROM)",
    countryFlag: "🇫🇷",
    status: "open",
    isFrance: true,
    isOutreMer: true,
    notes: "DROM — droit national français applicable. Marché actif à Saint-Denis et Saint-Pierre.",
  },
  {
    id: "mayotte-976",
    name: "Mayotte",
    countryCode: "FR",
    countryName: "France — Outre-mer (DROM)",
    countryFlag: "🇫🇷",
    status: "open",
    isFrance: true,
    isOutreMer: true,
    notes: "DROM depuis 2011 — droit national français applicable. Flotte disponible à Mamoudzou.",
  },
  // ── France — Outre-mer (COM) ──────────────────────────────────────────────
  {
    id: "saint-martin-978",
    name: "Saint-Martin",
    countryCode: "FR",
    countryName: "France — Outre-mer (COM)",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer — droit civil français applicable mais fiscalité et règles locales autonomes. " +
      "Contacter la Collectivité de Saint-Martin pour les dispositions locales en matière de publicité.",
  },
  {
    id: "saint-barthelemy-977",
    name: "Saint-Barthélemy",
    countryCode: "FR",
    countryName: "France — Outre-mer (COM)",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer à fiscalité propre. Règles publicitaires locales à vérifier auprès de la Collectivité avant déploiement.",
  },
  {
    id: "nouvelle-caledonie",
    name: "Nouvelle-Calédonie",
    countryCode: "FR",
    countryName: "France — Outre-mer (COM)",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    isOutreMer: true,
    notes:
      "Statut particulier (accord de Nouméa) — la publicité extérieure est régie par la législation locale du gouvernement calédonien. " +
      "Consulter les autorités compétentes avant tout déploiement.",
  },
  {
    id: "polynesie-francaise",
    name: "Polynésie française",
    countryCode: "FR",
    countryName: "France — Outre-mer (COM)",
    countryFlag: "🇫🇷",
    status: "restreint",
    isFrance: true,
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer autonome — la publicité est régie par la législation polynésienne propre. " +
      "Contacter les services compétents du Pays avant lancement.",
  },
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
  // ── Suède ─────────────────────────────────────────────────────────────────
  {
    id: "stockholm-se",
    name: "Stockholm",
    countryCode: "SE",
    countryName: "Suède",
    countryFlag: "🇸🇪",
    status: "open",
    notes: "Publicité mobile sur flotte autorisée. Loi suédoise sur le marketing (Marknadsföringslagen 2008:486) applicable.",
  },
  {
    id: "gothenburg-se",
    name: "Göteborg",
    countryCode: "SE",
    countryName: "Suède",
    countryFlag: "🇸🇪",
    status: "open",
  },
  {
    id: "malmo-se",
    name: "Malmö",
    countryCode: "SE",
    countryName: "Suède",
    countryFlag: "🇸🇪",
    status: "open",
  },
  // ── Danemark ──────────────────────────────────────────────────────────────
  {
    id: "copenhagen-dk",
    name: "Copenhague",
    countryCode: "DK",
    countryName: "Danemark",
    countryFlag: "🇩🇰",
    status: "open",
    notes: "Marché ouvert. Loi danoise sur le marketing (Markedsføringsloven) applicable. Pas de permis municipal spécifique pour les véhicules en covering.",
  },
  {
    id: "aarhus-dk",
    name: "Aarhus",
    countryCode: "DK",
    countryName: "Danemark",
    countryFlag: "🇩🇰",
    status: "open",
  },
  // ── Finlande ──────────────────────────────────────────────────────────────
  {
    id: "helsinki-fi",
    name: "Helsinki",
    countryCode: "FI",
    countryName: "Finlande",
    countryFlag: "🇫🇮",
    status: "open",
    notes: "Marché ouvert. Loi finlandaise sur la concurrence déloyale applicable. Pas de restriction spécifique pour la publicité mobile sur flotte.",
  },
  {
    id: "tampere-fi",
    name: "Tampere",
    countryCode: "FI",
    countryName: "Finlande",
    countryFlag: "🇫🇮",
    status: "open",
  },
  // ── Irlande ───────────────────────────────────────────────────────────────
  {
    id: "dublin-ie",
    name: "Dublin",
    countryCode: "IE",
    countryName: "Irlande",
    countryFlag: "🇮🇪",
    status: "open",
    notes: "Marché ouvert. Publicité mobile sur véhicule permise. Standards de l'ASAI (Advertising Standards Authority for Ireland) applicables.",
  },
  {
    id: "cork-ie",
    name: "Cork",
    countryCode: "IE",
    countryName: "Irlande",
    countryFlag: "🇮🇪",
    status: "open",
  },
  // ── Grèce ─────────────────────────────────────────────────────────────────
  {
    id: "athens-gr",
    name: "Athènes",
    countryCode: "GR",
    countryName: "Grèce",
    countryFlag: "🇬🇷",
    status: "restreint",
    notes:
      "Zone de l'Acropole et du centre historique classée UNESCO — éviter le périmètre protégé. " +
      "Loi grecque 2946/2001 sur la publicité extérieure applicable. Permis municipal recommandé.",
  },
  {
    id: "thessaloniki-gr",
    name: "Thessalonique",
    countryCode: "GR",
    countryName: "Grèce",
    countryFlag: "🇬🇷",
    status: "open",
    notes: "Marché ouvert. Loi 2946/2001 sur la publicité extérieure applicable.",
  },
  // ── République tchèque ────────────────────────────────────────────────────
  {
    id: "prague-cz",
    name: "Prague",
    countryCode: "CZ",
    countryName: "République tchèque",
    countryFlag: "🇨🇿",
    status: "restreint",
    notes:
      "Centre historique classé UNESCO (Staré Město, Josefov). " +
      "Réglementation municipale renforcée dans les zones patrimoniales. " +
      "Couverture de véhicule autorisée hors périmètre protégé.",
  },
  {
    id: "brno-cz",
    name: "Brno",
    countryCode: "CZ",
    countryName: "République tchèque",
    countryFlag: "🇨🇿",
    status: "open",
  },
  // ── Hongrie ───────────────────────────────────────────────────────────────
  {
    id: "budapest-hu",
    name: "Budapest",
    countryCode: "HU",
    countryName: "Hongrie",
    countryFlag: "🇭🇺",
    status: "restreint",
    notes:
      "Rives du Danube et quartier du château classés UNESCO. " +
      "Loi hongroise XLVIII/2008 sur la publicité commerciale applicable. " +
      "Permis de la mairie requis pour les véhicules publicitaires dédiés.",
  },
  {
    id: "debrecen-hu",
    name: "Debrecen",
    countryCode: "HU",
    countryName: "Hongrie",
    countryFlag: "🇭🇺",
    status: "open",
  },
  // ── Roumanie ──────────────────────────────────────────────────────────────
  {
    id: "bucharest-ro",
    name: "Bucarest",
    countryCode: "RO",
    countryName: "Roumanie",
    countryFlag: "🇷🇴",
    status: "open",
    notes: "Marché ouvert. Loi roumaine 148/2000 sur la publicité applicable. Marché en forte croissance pour la publicité mobile.",
  },
  {
    id: "cluj-napoca-ro",
    name: "Cluj-Napoca",
    countryCode: "RO",
    countryName: "Roumanie",
    countryFlag: "🇷🇴",
    status: "open",
  },
  {
    id: "timisoara-ro",
    name: "Timișoara",
    countryCode: "RO",
    countryName: "Roumanie",
    countryFlag: "🇷🇴",
    status: "open",
  },
  // ── Norvège (hors UE — EEE) ───────────────────────────────────────────────
  {
    id: "oslo-no",
    name: "Oslo",
    countryCode: "NO",
    countryName: "Norvège",
    countryFlag: "🇳🇴",
    status: "open",
    notes:
      "Hors UE (EEE). Loi norvégienne sur le marketing (Markedsføringsloven 2009) applicable. " +
      "Pas de permis spécifique pour les véhicules en covering. Restrictions sévères sur la publicité destinée aux mineurs.",
  },
  {
    id: "bergen-no",
    name: "Bergen",
    countryCode: "NO",
    countryName: "Norvège",
    countryFlag: "🇳🇴",
    status: "open",
    notes: "Hors UE (EEE). Réglementation norvégienne applicable.",
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
