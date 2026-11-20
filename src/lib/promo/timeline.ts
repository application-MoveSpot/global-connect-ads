export const DURATION = 45;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const CAPTION_BASELINE = 1545 - 120;
export const GPS_REFRESH_SECONDS = 30;
export const GPS_POINTS: readonly (readonly [number, number])[] = [[-380, 285], [-120, 285], [-120, 15], [140, 15], [140, -255], [380, -255]];
export function gpsPosition(time: number) {
  const progress = Math.min(5, Math.max(0, (time - 18) / 10 * 5));
  const segment = Math.min(4, Math.floor(progress));
  const a = GPS_POINTS[segment]; const b = GPS_POINTS[segment + 1];
  if (!a || !b) return { x: 0, y: 0, segment: 0, angle: 0 };
  const f = progress - segment;
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, segment, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
export function equationStage(time: number) {
  return time < 32 ? 0 : time < 34 ? 1 : 2;
}
export const OWNER_TERMS = {
  daysPerMonth: 22,
  minimumDailyEur: 17.5,
  advertiserShare: 0.7,
  denseZoneMonthlyEur: 514.5,
  validationHours: 48,
} as const;
export const OWNER_MONTHLY_EUR = OWNER_TERMS.daysPerMonth * OWNER_TERMS.minimumDailyEur;
export function euroAmount(amount: number) {
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 });
}

export const SHOTS = [
  { start: 0, end: 3, name: "L’accroche", title: `${euroAmount(OWNER_MONTHLY_EUR)} €/MOIS`, kicker: "ET SI TA VOITURE TE PAYAIT ?", subtitle: "385 euros par mois. Minimum garanti pour 22 jours." },
  { start: 3, end: 8, name: "Le constat", title: "À L’ARRÊT.", kicker: "ENTRE DEUX TRAJETS", subtitle: "Vous conduisez pour travailler. Votre voiture reste parfois à l’arrêt." },
  { start: 8, end: 18, name: "La transformation", title: "PRENEZ LA ROUTE.", kicker: "AVEC MOVESPOT", subtitle: `Un vinyle publicitaire sur votre véhicule. ${euroAmount(OWNER_TERMS.minimumDailyEur)} €/jour minimum garanti, soit ${OWNER_TERMS.advertiserShare * 100} % du tarif annonceur.` },
  { start: 18, end: 29, name: "Le suivi GPS", title: "EN MOUVEMENT.", kicker: "LA VISIBILITÉ", subtitle: "L’annonceur suit sa campagne grâce à la géolocalisation du véhicule." },
  { start: 29, end: 37, name: "L’opportunité", title: `${euroAmount(OWNER_MONTHLY_EUR)} €/MOIS`, kicker: "CÔTÉ PROPRIÉTAIRE · MINIMUM GARANTI", subtitle: `${OWNER_TERMS.daysPerMonth} jours × ${euroAmount(OWNER_TERMS.minimumDailyEur)} € = ${euroAmount(OWNER_MONTHLY_EUR)} €/mois. Jusqu’à ${euroAmount(OWNER_TERMS.denseZoneMonthlyEur)} €/mois en zone dense.` },
  { start: 37, end: 45, name: "La signature", title: "", kicker: "VOTRE PUB PREND LA ROUTE", subtitle: `Validation sous ${OWNER_TERMS.validationHours} h. Découvrez MoveSpot sur move-spot.com.` },
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