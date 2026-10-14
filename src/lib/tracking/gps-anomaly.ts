// Détection d'anomalies GPS pour le scoring anti-fraude.
// Appelé côté serveur sur les lots de points GPS reçus de pushPositionBatch.

export type GpsAnomalyFlag =
  | "zero_speed_in_zone" // vitesse nulle depuis > ZERO_SPEED_THRESHOLD_MIN minutes dans la zone
  | "out_of_zone" // % de points hors-zone dépasse le seuil
  | "too_regular_interval" // points réguliers au milliseconde → spoofing probable
  | "no_movement"; // aucun mouvement > STATIC_THRESHOLD_MIN minutes

// Seuils ajustables
const ZERO_SPEED_THRESHOLD_MIN = 15;
const OUT_OF_ZONE_THRESHOLD_PCT = 0.8; // 80 % des points hors zone
const REGULAR_INTERVAL_JITTER_MS = 500; // si écart-type < 500 ms → suspicion
const STATIC_THRESHOLD_MIN = 20;

type RawPoint = {
  lat: number;
  lng: number;
  speed: number | null;
  recorded_at: string;
  in_zone?: boolean;
};

export type AnomalyResult = {
  flags: GpsAnomalyFlag[];
  details: Record<GpsAnomalyFlag, string>;
};

export function detectGpsAnomalies(points: RawPoint[]): AnomalyResult {
  const flags: GpsAnomalyFlag[] = [];
  const details: Partial<Record<GpsAnomalyFlag, string>> = {};

  if (points.length < 3) return { flags, details: details as Record<GpsAnomalyFlag, string> };

  const sorted = [...points].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

  // ── 1. Arrêt prolongé (vitesse nulle) dans la zone de campagne ─────────────
  let zeroSpeedStreak = 0;
  let zeroSpeedStart: string | null = null;
  for (const p of sorted) {
    const speed = p.speed ?? 0;
    if (speed < 2) {
      // < 2 km/h = considéré arrêté
      if (!zeroSpeedStart) zeroSpeedStart = p.recorded_at;
      zeroSpeedStreak =
        (new Date(p.recorded_at).getTime() - new Date(zeroSpeedStart).getTime()) / 60_000;
    } else {
      zeroSpeedStreak = 0;
      zeroSpeedStart = null;
    }
    if (zeroSpeedStreak > ZERO_SPEED_THRESHOLD_MIN) {
      flags.push("zero_speed_in_zone");
      details["zero_speed_in_zone"] =
        `Véhicule arrêté depuis ${Math.round(zeroSpeedStreak)} min dans la zone`;
      break;
    }
  }

  // ── 2. Trop grand % de points hors zone ────────────────────────────────────
  const zonedPoints = sorted.filter((p) => p.in_zone !== undefined);
  if (zonedPoints.length >= 10) {
    const outCount = zonedPoints.filter((p) => !p.in_zone).length;
    const pct = outCount / zonedPoints.length;
    if (pct >= OUT_OF_ZONE_THRESHOLD_PCT) {
      flags.push("out_of_zone");
      details["out_of_zone"] =
        `${Math.round(pct * 100)}% des points hors zone (seuil ${Math.round(OUT_OF_ZONE_THRESHOLD_PCT * 100)}%)`;
    }
  }

  // ── 3. Intervalles trop réguliers (possible GPS simulé) ───────────────────
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(
      new Date(sorted[i].recorded_at).getTime() - new Date(sorted[i - 1].recorded_at).getTime(),
    );
  }
  if (intervals.length >= 10) {
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < REGULAR_INTERVAL_JITTER_MS) {
      flags.push("too_regular_interval");
      details["too_regular_interval"] =
        `Écart-type des intervalles GPS : ${Math.round(stdDev)} ms (seuil ${REGULAR_INTERVAL_JITTER_MS} ms)`;
    }
  }

  // ── 4. Aucun déplacement significatif ──────────────────────────────────────
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const spanMin =
    (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / 60_000;
  if (spanMin >= STATIC_THRESHOLD_MIN) {
    const moved = sorted.some(
      (p) => Math.abs(p.lat - first.lat) > 0.0001 || Math.abs(p.lng - first.lng) > 0.0001,
    );
    if (!moved) {
      flags.push("no_movement");
      details["no_movement"] = `Aucun déplacement sur ${Math.round(spanMin)} min`;
    }
  }

  return { flags, details: details as Record<GpsAnomalyFlag, string> };
}
