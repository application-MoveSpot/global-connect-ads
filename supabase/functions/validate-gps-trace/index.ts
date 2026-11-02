// GPS Trace Validation — Anti-Fraud Engine for MoveSpot
//
// Appelée après chaque segment de trajet (batch de points GPS).
// Détecte : vitesse impossible, téléportation, points statiques répétés,
// et incohérences d'altitude. Met à jour le fraud score du conducteur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Constants ────────────────────────────────────────────────────────────────

// Au-delà de 200 km/h, on considère le GPS comme frauduleux.
// Valeur conservative : même une moto de course sur autoroute reste en dessous.
const MAX_REALISTIC_SPEED_KMH = 200;

// Moins de 30 secondes et plus de 5 km = téléportation.
const TELEPORT_DISTANCE_M = 5000;
const TELEPORT_TIME_S = 30;

// Si les 10 derniers points sont dans un rayon de 20m sur 5 min → simulateur statique
const STATIC_SPOOFING_RADIUS_M = 20;
const STATIC_SPOOFING_MIN_POINTS = 10;

// Incrément de fraud score par type d'alerte
const SCORE_INCREMENTS: Record<string, number> = {
  impossible_speed: 25,
  teleportation: 30,
  static_spoofing: 20,
  altitude_anomaly: 10,
  mock_location: 40,
};

// ─── Geo helpers ─────────────────────────────────────────────────────────────

// Haversine — distance en mètres entre deux coordonnées GPS.
// Plus précis que la formule euclidienne sur de petites distances.
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // rayon Terre en mètres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Vitesse en km/h entre deux points avec timestamps ISO
function speedKmh(
  lat1: number, lng1: number, t1: string,
  lat2: number, lng2: number, t2: string,
): { speed: number; distanceM: number; elapsedS: number } {
  const distanceM = haversineMeters(lat1, lng1, lat2, lng2);
  const elapsedS = (new Date(t2).getTime() - new Date(t1).getTime()) / 1000;
  if (elapsedS <= 0) return { speed: 9999, distanceM, elapsedS: 0 };
  const speed = (distanceM / elapsedS) * 3.6;
  return { speed, distanceM, elapsedS };
}

// Détecte si tous les points d'un cluster sont dans un rayon donné
function isStaticCluster(
  points: GpsPoint[],
  radiusM: number,
): boolean {
  if (points.length < STATIC_SPOOFING_MIN_POINTS) return false;
  const ref = points[0];
  return points.every(
    (p) => haversineMeters(ref.lat, ref.lng, p.lat, p.lng) <= radiusM,
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type GpsPoint = {
  lat: number;
  lng: number;
  recorded_at: string;
  accuracy?: number;
  altitude?: number;
  speed?: number; // vitesse déclarée par le device
  is_mock?: boolean; // FLAG_MOCK_LOCATION Android
};

type FraudAlert = {
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  point_a?: GpsPoint;
  point_b?: GpsPoint;
  computed_speed_kmh?: number;
  distance_m?: number;
  elapsed_s?: number;
  fraud_score: number;
};

// ─── Analysis ────────────────────────────────────────────────────────────────

function analyzeTrace(points: GpsPoint[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  // 1. Mock location flag — déclaré par l'app mobile
  const mockPoints = points.filter((p) => p.is_mock === true);
  if (mockPoints.length > 0) {
    alerts.push({
      alert_type: "mock_location",
      severity: "critical",
      point_a: mockPoints[0],
      fraud_score: SCORE_INCREMENTS.mock_location,
    });
  }

  // 2. Analyse point à point : vitesse impossible et téléportation
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const { speed, distanceM, elapsedS } = speedKmh(
      a.lat, a.lng, a.recorded_at,
      b.lat, b.lng, b.recorded_at,
    );

    // Vitesse impossible
    if (speed > MAX_REALISTIC_SPEED_KMH) {
      alerts.push({
        alert_type: "impossible_speed",
        severity: speed > 500 ? "critical" : "high",
        point_a: a,
        point_b: b,
        computed_speed_kmh: Math.round(speed),
        distance_m: Math.round(distanceM),
        elapsed_s: Math.round(elapsedS),
        fraud_score: SCORE_INCREMENTS.impossible_speed,
      });
    }

    // Téléportation : grand saut en très peu de temps
    if (distanceM > TELEPORT_DISTANCE_M && elapsedS < TELEPORT_TIME_S) {
      alerts.push({
        alert_type: "teleportation",
        severity: "critical",
        point_a: a,
        point_b: b,
        computed_speed_kmh: Math.round(speed),
        distance_m: Math.round(distanceM),
        elapsed_s: Math.round(elapsedS),
        fraud_score: SCORE_INCREMENTS.teleportation,
      });
    }

    // Cohérence entre vitesse déclarée par le device et vitesse calculée.
    // Un écart > 50 km/h trahit souvent un simulateur GPS.
    if (a.speed != null && Math.abs(a.speed * 3.6 - speed) > 50) {
      alerts.push({
        alert_type: "altitude_anomaly", // on réutilise le slot — renommer si besoin
        severity: "medium",
        point_a: a,
        point_b: b,
        computed_speed_kmh: Math.round(speed),
        fraud_score: SCORE_INCREMENTS.altitude_anomaly,
      });
    }
  }

  // 3. Cluster statique — fenêtre glissante sur les 10 derniers points
  if (points.length >= STATIC_SPOOFING_MIN_POINTS) {
    const last10 = points.slice(-STATIC_SPOOFING_MIN_POINTS);
    if (isStaticCluster(last10, STATIC_SPOOFING_RADIUS_M)) {
      alerts.push({
        alert_type: "static_spoofing",
        severity: "high",
        point_a: last10[0],
        point_b: last10[last10.length - 1],
        fraud_score: SCORE_INCREMENTS.static_spoofing,
      });
    }
  }

  return alerts;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { vehicle_id, driver_id, campaign_request_id, points } = await req.json() as {
    vehicle_id: string;
    driver_id?: string;
    campaign_request_id?: string;
    points: GpsPoint[];
  };

  if (!vehicle_id || !Array.isArray(points) || points.length < 2) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }

  const alerts = analyzeTrace(points);

  if (alerts.length === 0) {
    return new Response(JSON.stringify({ clean: true, alerts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Persiste les alertes en base
  const rows = alerts.map((a) => ({
    vehicle_id,
    driver_id: driver_id ?? null,
    campaign_request_id: campaign_request_id ?? null,
    alert_type: a.alert_type,
    severity: a.severity,
    point_a: a.point_a ?? null,
    point_b: a.point_b ?? null,
    computed_speed_kmh: a.computed_speed_kmh ?? null,
    distance_m: a.distance_m ?? null,
    elapsed_s: a.elapsed_s ?? null,
    fraud_score: a.fraud_score,
  }));

  await supabase.from("gps_fraud_alerts").insert(rows);

  // Incrémente le fraud score du conducteur si connu
  if (driver_id) {
    const totalIncrement = alerts.reduce((sum, a) => sum + a.fraud_score, 0);

    // Upsert : crée la ligne si elle n'existe pas encore
    const { data: current } = await supabase
      .from("driver_fraud_scores")
      .select("score, total_alerts")
      .eq("driver_id", driver_id)
      .single();

    await supabase.from("driver_fraud_scores").upsert({
      driver_id,
      score: Math.min(100, (current?.score ?? 0) + totalIncrement),
      total_alerts: (current?.total_alerts ?? 0) + alerts.length,
      last_alert_at: new Date().toISOString(),
    });
  }

  return new Response(
    JSON.stringify({ clean: false, alerts_count: alerts.length, alerts }),
    { headers: { "Content-Type": "application/json" } },
  );
});
