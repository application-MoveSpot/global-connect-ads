// Charte de contenu MoveSpot — mots interdits dans les briefs et campagnes.
// Tout match déclenche un refus automatique côté formulaire.
export const FORBIDDEN_KEYWORDS = [
  // Religion & fêtes religieuses
  "religion", "religieux", "religieuse", "église", "eglise", "mosquée", "mosquee", "synagogue", "temple",
  "dieu", "allah", "jésus", "jesus", "christ", "bouddha", "ramadan", "pâques", "paques", "noël", "noel",
  "hanouka", "aïd", "aid", "baptême", "bapteme", "communion",
  // Anniversaires (personnels / privés) — exclus du B2C MoveSpot
  "anniversaire", "joyeux anniversaire", "bon anniversaire",
  // Sexisme / discrimination
  "sexiste", "misogyne", "machiste", "femme à la cuisine", "infériorité",
  // Pornographie / nudité
  "porno", "pornographique", "xxx", "nudité", "nudite", "sexe", "escort", "érotique", "erotique",
  // Violence
  "violence", "violent", "tuer", "meurtre", "arme", "sang", "agression", "frapper", "battre",
  // Politique / électoral
  "politique", "parti", "élection", "election", "candidat", "candidate", "campagne électorale",
  "vote", "voter", "scrutin", "président", "presidente", "député", "depute", "sénateur", "senateur",
  "maire", "ministre", "gouvernement", "république", "republique",
  "extrême droite", "extreme droite", "extrême gauche", "extreme gauche",
];

export function findForbiddenKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  return FORBIDDEN_KEYWORDS.find((k) => lower.includes(k)) ?? null;
}
