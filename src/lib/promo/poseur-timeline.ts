/** Scénario du film vertical « Poseurs » (35 s, 4 séquences, 1080×1920). */
export const POSEUR_DURATION = 35;
export const POSEUR_WIDTH = 1080;
export const POSEUR_HEIGHT = 1920;

export const POSEUR_SEQUENCES = [
  { id: "accroche", start: 0, end: 6 },
  { id: "mise-en-relation", start: 6, end: 16 },
  { id: "validation", start: 16, end: 27 },
  { id: "inscription", start: 27, end: 35 },
] as const;

export type PoseurSequenceId = (typeof POSEUR_SEQUENCES)[number]["id"];

export const POSEUR_CAPTIONS = [
  { start: 0, end: 3, text: "Poseur vinyle, covering ou vitres teintées en Guadeloupe ?" },
  { start: 3, end: 6, text: "Remplis tes créneaux libres sans démarcher." },
  { start: 6, end: 9.5, text: "MoveSpot est une plateforme de mise en relation :" },
  { start: 9.5, end: 12.5, text: "dès qu'une campagne locale est réservée," },
  { start: 12.5, end: 16, text: "la mission de pose arrive prête dans ton planning." },
  { start: 16, end: 18.5, text: "Zéro prospection commerciale." },
  { start: 18.5, end: 20.5, text: "Tu poses l'adhésif," },
  { start: 20.5, end: 23.5, text: "tu valides avec 4 photos dans l'application," },
  {
    start: 23.5,
    end: 27,
    text: "et ton paiement est sécurisé via Stripe Connect (RC Pro vérifiée).",
  },
  { start: 27, end: 30.5, text: "Référence ton atelier gratuitement sur move-spot.com" },
  { start: 30.5, end: 35, text: "Baie-Mahault · Jarry · Pointe-à-Pitre · Basse-Terre" },
] as const;

export const POSEUR_CITIES = ["Baie-Mahault", "Jarry", "Pointe-à-Pitre", "Basse-Terre"] as const;

export const POSEUR_PHOTOS = ["Face avant", "Face arrière", "Profil gauche", "Profil droit"] as const;

export function clampPoseurTime(time: number): number {
  return Math.min(POSEUR_DURATION, Math.max(0, time));
}

export function poseurSequenceAt(time: number): PoseurSequenceId {
  const t = clampPoseurTime(time);
  const found = POSEUR_SEQUENCES.find((s) => t >= s.start && t < s.end);
  return found ? found.id : "inscription";
}

export function poseurCaptionAt(time: number): string {
  const t = clampPoseurTime(time);
  const found = POSEUR_CAPTIONS.find((c) => t >= c.start && t < c.end);
  return found ? found.text : POSEUR_CAPTIONS[POSEUR_CAPTIONS.length - 1]!.text;
}
