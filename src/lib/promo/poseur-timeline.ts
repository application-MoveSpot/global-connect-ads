/** Scénario du film vertical « Poseurs » (35 s, 4 séquences, 1080×1920). */
export const POSEUR_DURATION = 35;
export const POSEUR_WIDTH = 1080;
export const POSEUR_HEIGHT = 1920;

export const POSEUR_SEQUENCES = [
  { id: "accroche", start: 0, end: 7 },
  { id: "missions", start: 7, end: 16 },
  { id: "validation", start: 16, end: 27 },
  { id: "paiement", start: 27, end: 35 },
] as const;

export type PoseurSequenceId = (typeof POSEUR_SEQUENCES)[number]["id"];

export const POSEUR_CAPTIONS = [
  { start: 0, end: 2.5, text: "Poseur vinyle ou covering en Guadeloupe ?" },
  { start: 2.5, end: 4.5, text: "Inscris ton atelier (SIRET, Kbis, RC Pro)." },
  {
    start: 4.5,
    end: 7,
    text: "14 jours d'essai gratuit (puis 29 €, 42 € ou 59 €/mois sans engagement).",
  },
  { start: 7, end: 9, text: "Zéro démarchage commercial." },
  { start: 9, end: 12, text: "MoveSpot t'envoie les missions de pose dans ta zone" },
  { start: 12, end: 14.5, text: "avec honoraire affiché, adresse et créneau." },
  { start: 14.5, end: 16, text: "Acceptation en 1 clic." },
  { start: 16, end: 18, text: "Pose validée par 4 photos." },
  { start: 18, end: 21, text: "Tu poses l'adhésif publicitaire sur carrosserie" },
  {
    start: 21,
    end: 24.5,
    text: "et tu valides avec 4 photos (avant, arrière, profil gauche et droit)",
  },
  { start: 24.5, end: 27, text: "sous 48h ouvrées." },
  { start: 27, end: 29, text: "Virement Stripe Connect + dépose." },
  { start: 29, end: 31, text: "Virement automatique sur ton RIB via Stripe Connect," },
  { start: 31, end: 33.5, text: "plus la mission de dépose rémunérée en fin de campagne." },
  { start: 33.5, end: 35, text: "Rejoins move-spot.com" },
] as const;

export const POSEUR_DOCUMENTS = ["SIRET", "Kbis", "RC Pro"] as const;

export const POSEUR_PHOTOS = ["Avant", "Arrière", "Profil gauche", "Profil droit"] as const;

export function clampPoseurTime(time: number): number {
  return Math.min(POSEUR_DURATION, Math.max(0, time));
}

export function poseurSequenceAt(time: number): PoseurSequenceId {
  const t = clampPoseurTime(time);
  const found = POSEUR_SEQUENCES.find((s) => t >= s.start && t < s.end);
  return found ? found.id : "paiement";
}

export function poseurCaptionAt(time: number): string {
  const t = clampPoseurTime(time);
  const found = POSEUR_CAPTIONS.find((c) => t >= c.start && t < c.end);
  return found ? found.text : POSEUR_CAPTIONS[POSEUR_CAPTIONS.length - 1]!.text;
}
