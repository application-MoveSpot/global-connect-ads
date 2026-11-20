export const DURATION = 45;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SHOTS = [
  { start: 0, end: 3, name: "L’accroche", title: "DU POTENTIEL.", kicker: "VOTRE VOITURE A", subtitle: "Et si votre voiture devenait un espace publicitaire ?" },
  { start: 3, end: 8, name: "Le constat", title: "À L’ARRÊT.", kicker: "ENTRE DEUX TRAJETS", subtitle: "Vous conduisez pour travailler. Votre voiture reste parfois à l’arrêt." },
  { start: 8, end: 18, name: "La transformation", title: "PRENEZ LA ROUTE.", kicker: "AVEC MOVESPOT", subtitle: "Un vinyle publicitaire sur votre véhicule. Une marque qui prend la route." },
  { start: 18, end: 29, name: "Le suivi GPS", title: "EN MOUVEMENT.", kicker: "LA VISIBILITÉ", subtitle: "L’annonceur suit sa campagne grâce à la géolocalisation du véhicule." },
  { start: 29, end: 37, name: "L’opportunité", title: "CHAQUE TRAJET.", kicker: "VALORISEZ", subtitle: "Découvrez les campagnes disponibles avec MoveSpot." },
  { start: 37, end: 45, name: "La signature", title: "MoveSpot", kicker: "VOTRE PUB PREND LA ROUTE", subtitle: "Découvrez MoveSpot sur move-spot.com." },
] as const;

export function shotAt(time: number) {
  return SHOTS.find((s) => time >= s.start && time < s.end) ?? SHOTS[SHOTS.length - 1];
}

export function spring(t: number) {
  return 1 - Math.exp(-7 * Math.max(t, 0)) * Math.cos(11 * Math.max(t, 0));
}

export function captionAt(time: number) {
  const shot = shotAt(time);
  const words = shot.subtitle.split(" ");
  const position = Math.min(words.length - 1, Math.floor(Math.max(0, time - shot.start) / (shot.end - shot.start) * words.length));
  const start = Math.floor(position / 4) * 4;
  return { words: words.slice(start, start + 4), active: position - start };
}

export function recorderFormat(supported: (mime: string) => boolean) {
  for (const mime of ["video/mp4;codecs=avc1.424028", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (supported(mime)) return { mime, extension: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  return null;
}