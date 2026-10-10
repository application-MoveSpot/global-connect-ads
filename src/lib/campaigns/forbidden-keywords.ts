// Charte de contenu MoveSpot — mots interdits dans les briefs et campagnes.
// Tout match déclenche un refus automatique côté formulaire.

type ForbiddenCategory = {
  category: string;
  keywords: string[];
  advice: string;
};

const FORBIDDEN_CATEGORIES: ForbiddenCategory[] = [
  {
    category: "Anniversaire personnel",
    keywords: ["anniversaire", "joyeux anniversaire", "bon anniversaire"],
    advice:
      "Les anniversaires personnels sont hors charte MoveSpot. Vous pouvez en revanche promouvoir l'anniversaire d'une enseigne, d'une association ou un événement public.",
  },
  {
    category: "Religion",
    keywords: [
      "religion", "religieux", "religieuse", "église", "eglise", "mosquée", "mosquee",
      "synagogue", "temple", "dieu", "allah", "jésus", "jesus", "christ", "bouddha",
      "ramadan", "pâques", "paques", "noël", "noel", "hanouka", "aïd", "aid",
      "baptême", "bapteme", "communion",
    ],
    advice:
      "Les contenus à caractère religieux sont strictement interdits sur MoveSpot, conformément à la charte de neutralité (art. 8).",
  },
  {
    category: "Politique / électoral",
    keywords: [
      "politique", "parti", "élection", "election", "candidat", "candidate",
      "campagne électorale", "vote", "voter", "scrutin", "président", "presidente",
      "député", "depute", "sénateur", "senateur", "maire", "ministre", "gouvernement",
      "république", "republique", "extrême droite", "extreme droite",
      "extrême gauche", "extreme gauche",
    ],
    advice:
      "Toute communication politique, partisane ou électorale est interdite sur MoveSpot (art. 9). Cela inclut les soutiens à des candidats ou partis.",
  },
  {
    category: "Contenu adulte",
    keywords: [
      "porno", "pornographique", "xxx", "nudité", "nudite", "sexe", "escort",
      "érotique", "erotique",
    ],
    advice:
      "Les contenus à caractère sexuel ou pornographique sont strictement interdits. Le brief sera refusé sans remboursement.",
  },
  {
    category: "Violence",
    keywords: [
      "violence", "violent", "tuer", "meurtre", "arme", "sang", "agression",
      "frapper", "battre",
    ],
    advice:
      "Les contenus faisant référence à la violence sont interdits. Reformulez votre message sans ces termes.",
  },
  {
    category: "Sexisme / discrimination",
    keywords: ["sexiste", "misogyne", "machiste", "femme à la cuisine", "infériorité"],
    advice:
      "Les contenus sexistes ou discriminatoires sont interdits et passibles de refus immédiat.",
  },
  {
    category: "Événement festif saisonnier",
    keywords: [
      "carnaval", "halloween", "toussaint", "sorcière", "sorciere",
      "zombie", "squelette", "citrouille", "déguisement", "deguisement",
      "déguisé", "deguise", "mascarade", "mardi gras",
    ],
    advice:
      "Les événements festifs saisonniers (carnaval, Halloween…) ne sont pas acceptés sur MoveSpot. La plateforme est réservée aux campagnes commerciales, institutionnelles et associatives pérennes.",
  },
  {
    category: "Discipline spirituelle",
    keywords: [
      "yoga", "yogi", "yogique",
      "méditation", "meditation", "méditer",
      "chakra", "chakras",
      "reiki",
      "ayurveda", "ayurvédique", "ayurvedique",
      "kundalini",
      "pranayama",
      "spirituel", "spirituelle", "spiritualité", "spiritualite",
      "éveil spirituel", "eveil spirituel",
      "bien-être spirituel",
    ],
    advice:
      "Les disciplines spirituelles (yoga, méditation, reiki, ayurvéda…) ne sont pas acceptées sur MoveSpot. La plateforme est réservée aux activités commerciales, associatives et événementielles laïques.",
  },
  {
    category: "Cannabis / CBD",
    keywords: [
      "cannabis", "marijuana", "weed", "cbd", "thc", "dispensary", "dispensaire",
      "hash", "hashish", "herbe", "joint", "ganja", "chanvre récréatif",
      "recreational cannabis", "medical marijuana", "pot shop",
    ],
    advice:
      "MoveSpot n'accepte pas les campagnes liées au cannabis ou aux produits CBD. Cette catégorie est hors charte de la plateforme.",
  },
  {
    category: "Tabac / Vapotage",
    keywords: [
      "cigarette", "tabac", "tobacco", "cigare", "cigar", "pipe à tabac",
      "vapotage", "vaping", "e-cigarette", "e-cig", "vape", "vapeur nicotine",
      "nicotine", "pod system", "juul", "iqos", "snuff", "snus",
    ],
    advice:
      "MoveSpot n'accepte pas les campagnes tabac, cigarettes électroniques ou produits de vapotage. Cette catégorie est hors charte de la plateforme.",
  },
  {
    category: "Jeux / Paris sportifs",
    keywords: [
      "casino", "jeux d'argent", "paris sportifs", "pari sportif", "gambling",
      "betting", "bookmaker", "bet365", "winamax", "pmu", "fdj", "loto",
      "machine à sous", "slot machine", "poker en ligne", "online poker",
      "roulette", "blackjack en ligne", "jackpot", "mise", "cote", "odds",
    ],
    advice:
      "MoveSpot n'accepte pas les campagnes jeux d'argent et paris sportifs. Cette catégorie est hors charte de la plateforme.",
  },
];

export type ForbiddenMatch = {
  keyword: string;
  category: string;
  advice: string;
};

export function findForbiddenMatch(text: string): ForbiddenMatch | null {
  const lower = text.toLowerCase();
  for (const { category, keywords, advice } of FORBIDDEN_CATEGORIES) {
    const found = keywords.find((k) => lower.includes(k));
    if (found) return { keyword: found, category, advice };
  }
  return null;
}

export const FORBIDDEN_KEYWORDS = FORBIDDEN_CATEGORIES.flatMap((c) => c.keywords);

export function findForbiddenKeyword(text: string): string | null {
  return findForbiddenMatch(text)?.keyword ?? null;
}
