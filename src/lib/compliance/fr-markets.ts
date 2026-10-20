// Regulatory status of French cities for mobile fleet advertising (vehicle wrapping).
// "open"           — standard French law applies (Loi Évin, ARPP, décret 2012-118 sur la pub extérieure).
// "reglementation" — specific municipal RLP (Règlement Local de Publicité) in force with extra constraints.
// "zone_protegee"  — protected zone (AVAP/ZPPAUP, site classé, secteur sauvegardé): very restrictive,
//                    covering is legal but itineraries must avoid the perimeter.
//
// Outre-mer (DROM/COM):
//   DROMs (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte): French national law applies fully.
//   COMs (Saint-Martin, Saint-Barthélemy, Nouvelle-Calédonie, Polynésie française): partial autonomy,
//        local advertising rules may differ — "reglementation" status.

export type FrMarketStatus = "open" | "reglementation" | "zone_protegee";

export type FrCity = {
  id: string;
  name: string;
  department: string;
  status: FrMarketStatus;
  notes?: string;
  /** true for DROM/COM territories outside metropolitan France */
  isOutreMer?: boolean;
};

export const FR_CITIES: FrCity[] = [
  // ── Open markets ──────────────────────────────────────────────────────────
  { id: "bordeaux-33", name: "Bordeaux", department: "Gironde (33)", status: "open" },
  { id: "toulouse-31", name: "Toulouse", department: "Haute-Garonne (31)", status: "open" },
  { id: "nantes-44", name: "Nantes", department: "Loire-Atlantique (44)", status: "open" },
  { id: "rennes-35", name: "Rennes", department: "Ille-et-Vilaine (35)", status: "open" },
  { id: "lille-59", name: "Lille", department: "Nord (59)", status: "open" },
  { id: "montpellier-34", name: "Montpellier", department: "Hérault (34)", status: "open" },
  { id: "strasbourg-67", name: "Strasbourg", department: "Bas-Rhin (67)", status: "open" },
  { id: "grenoble-38", name: "Grenoble", department: "Isère (38)", status: "open" },
  { id: "nice-06", name: "Nice", department: "Alpes-Maritimes (06)", status: "open" },
  { id: "marseille-13", name: "Marseille", department: "Bouches-du-Rhône (13)", status: "open" },
  { id: "tours-37", name: "Tours", department: "Indre-et-Loire (37)", status: "open" },
  { id: "dijon-21", name: "Dijon", department: "Côte-d'Or (21)", status: "open" },
  { id: "reims-51", name: "Reims", department: "Marne (51)", status: "open" },
  { id: "le-havre-76", name: "Le Havre", department: "Seine-Maritime (76)", status: "open" },
  { id: "caen-14", name: "Caen", department: "Calvados (14)", status: "open" },
  // ── RLP renforcé ──────────────────────────────────────────────────────────
  {
    id: "paris-75",
    name: "Paris",
    department: "Paris (75)",
    status: "reglementation",
    notes:
      "Le RLP de Paris (2011, révisé 2024) interdit les véhicules publicitaires dédiés (camions-sandwichs) " +
      "dans les zones résidentielles et à proximité des écoles. Les véhicules en covering circulant pour leur " +
      "activité propre sont autorisés. Éviter le centre historique (Marais, Île de la Cité) lors du déploiement.",
  },
  {
    id: "lyon-69",
    name: "Lyon",
    department: "Rhône (69)",
    status: "reglementation",
    notes:
      "RLP métropolitain en vigueur. Publicité mobile sur véhicule utilitaire autorisée hors zones sensibles " +
      "(Vieux-Lyon, secteur sauvegardé 5e). Déclaration préalable conseillée auprès de la Métropole.",
  },
  // ── Outre-mer — DROM (droit français intégral) ───────────────────────────
  {
    id: "guadeloupe-971",
    name: "Guadeloupe",
    department: "Guadeloupe (971)",
    status: "open",
    isOutreMer: true,
    notes:
      "DROM — droit national français intégralement applicable (Loi Évin, décret 2012-118, ARPP). " +
      "Flotte disponible à Pointe-à-Pitre et Basse-Terre.",
  },
  {
    id: "martinique-972",
    name: "Martinique",
    department: "Martinique (972)",
    status: "open",
    isOutreMer: true,
    notes:
      "DROM — droit national français applicable. Marché actif à Fort-de-France et l'agglomération Centre.",
  },
  {
    id: "guyane-973",
    name: "Guyane",
    department: "Guyane (973)",
    status: "open",
    isOutreMer: true,
    notes:
      "DROM — droit national français applicable. Flotte disponible principalement à Cayenne et Saint-Laurent-du-Maroni.",
  },
  {
    id: "reunion-974",
    name: "La Réunion",
    department: "La Réunion (974)",
    status: "open",
    isOutreMer: true,
    notes: "DROM — droit national français applicable. Marché actif à Saint-Denis et Saint-Pierre.",
  },
  {
    id: "mayotte-976",
    name: "Mayotte",
    department: "Mayotte (976)",
    status: "open",
    isOutreMer: true,
    notes: "DROM depuis 2011 — droit national français applicable. Flotte disponible à Mamoudzou.",
  },
  // ── Outre-mer — COM (autonomie partielle) ────────────────────────────────
  {
    id: "saint-martin-978",
    name: "Saint-Martin",
    department: "Saint-Martin (978)",
    status: "reglementation",
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer — droit civil français applicable mais fiscalité et règles locales autonomes. " +
      "Contacter la Collectivité de Saint-Martin pour les dispositions locales en matière de publicité.",
  },
  {
    id: "saint-barthelemy-977",
    name: "Saint-Barthélemy",
    department: "Saint-Barthélemy (977)",
    status: "reglementation",
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer à fiscalité propre. Règles publicitaires locales à vérifier auprès de la Collectivité avant déploiement.",
  },
  {
    id: "nouvelle-caledonie",
    name: "Nouvelle-Calédonie",
    department: "Nouvelle-Calédonie",
    status: "reglementation",
    isOutreMer: true,
    notes:
      "Statut particulier (accord de Nouméa) — la publicité extérieure est régie par la législation locale du gouvernement calédonien. " +
      "Consulter les autorités compétentes avant tout déploiement.",
  },
  {
    id: "polynesie-francaise",
    name: "Polynésie française",
    department: "Polynésie française",
    status: "reglementation",
    isOutreMer: true,
    notes:
      "Collectivité d'outre-mer autonome — la publicité est régie par la législation polynésienne propre. " +
      "Contacter les services compétents du Pays avant lancement.",
  },
  // ── Zones protégées ───────────────────────────────────────────────────────
  {
    id: "versailles-78",
    name: "Versailles",
    department: "Yvelines (78)",
    status: "zone_protegee",
    notes:
      "Site classé UNESCO (Château et parc de Versailles). Toute publicité mobile est fortement déconseillée " +
      "dans le périmètre classé. Consultez l'ABF (Architecte des Bâtiments de France) avant lancement.",
  },
  {
    id: "avignon-84",
    name: "Avignon",
    department: "Vaucluse (84)",
    status: "zone_protegee",
    notes:
      "Centre historique classé UNESCO (remparts et palais des Papes). Couverture de véhicule autorisée " +
      "hors du périmètre protégé. Vérifier les règles de l'AVAP avec la mairie avant déploiement.",
  },
];

export function findFrCity(id: string): FrCity | undefined {
  return FR_CITIES.find((c) => c.id === id);
}
