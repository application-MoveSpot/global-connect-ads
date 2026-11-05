import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AnalyzeGpsRequest {
  trigger?: string;
  campaign_id?: string;
  vehicle_id?: string;
  date?: string;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: AnalyzeGpsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = body.date ?? new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const analysisDate = body.trigger === "cron" ? yesterday : today;
  const summary: string[] = [];

  // Fetch active campaigns to analyze (or specific one)
  let campaignQuery = supabase
    .from("campaign_requests")
    .select("id, vehicle_id")
    .eq("pm_status", "active");

  if (body.campaign_id) {
    campaignQuery = campaignQuery.eq("id", body.campaign_id);
  }
  if (body.vehicle_id) {
    campaignQuery = campaignQuery.eq("vehicle_id", body.vehicle_id);
  }

  const { data: campaigns } = await campaignQuery;

  for (const campaign of campaigns ?? []) {
    // Fetch ordered positions for this campaign/day
    const { data: positions } = await supabase
      .from("vehicle_positions")
      .select("lat, lng, speed, recorded_at")
      .eq("campaign_request_id", campaign.id)
      .gte("recorded_at", `${analysisDate}T00:00:00Z`)
      .lt("recorded_at", `${analysisDate}T23:59:59Z`)
      .order("recorded_at", { ascending: true });

    if (!positions || positions.length < 2) continue;

    let anomaliesFound = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const prevTime = new Date(prev.recorded_at).getTime();
      const currTime = new Date(curr.recorded_at).getTime();
      const elapsedS = (currTime - prevTime) / 1000;

      if (elapsedS <= 0 || elapsedS > 3600) continue;

      const distanceM = haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
      const speedKmh = (distanceM / elapsedS) * 3.6;

      // Null island check
      if (Math.abs(curr.lat) < 0.001 && Math.abs(curr.lng) < 0.001) {
        const { data: existing } = await supabase
          .from("gps_fraud_alerts")
          .select("id")
          .eq("vehicle_id", campaign.vehicle_id)
          .eq("alert_type", "null_island_spoof")
          .gte("detected_at", `${analysisDate}T00:00:00Z`)
          .maybeSingle();

        if (!existing) {
          await supabase.from("gps_fraud_alerts").insert({
            vehicle_id: campaign.vehicle_id,
            alert_type: "null_island_spoof",
            severity: "high",
            detected_at: curr.recorded_at,
            campaign_request_id: campaign.id,
            point_a: { lat: prev.lat, lng: prev.lng, at: prev.recorded_at },
            point_b: { lat: curr.lat, lng: curr.lng, at: curr.recorded_at },
            computed_speed_kmh: 0,
            distance_m: 0,
            elapsed_s: elapsedS,
            fraud_score: 80,
            resolved: false,
          });
          anomaliesFound++;
        }
        continue;
      }

      // Impossible speed check
      if (speedKmh > 180) {
        const severity = speedKmh > 500 ? "critical" : speedKmh > 300 ? "high" : "medium";
        const fraudScore = Math.min(100, Math.floor(speedKmh / 10));

        await supabase.from("gps_fraud_alerts").insert({
          vehicle_id: campaign.vehicle_id,
          alert_type: "impossible_speed",
          severity,
          detected_at: curr.recorded_at,
          campaign_request_id: campaign.id,
          point_a: { lat: prev.lat, lng: prev.lng, at: prev.recorded_at },
          point_b: { lat: curr.lat, lng: curr.lng, at: curr.recorded_at },
          computed_speed_kmh: Math.round(speedKmh * 10) / 10,
          distance_m: Math.round(distanceM),
          elapsed_s: Math.round(elapsedS),
          fraud_score: fraudScore,
          resolved: false,
        }).catch(() => null); // Ignore unique conflicts

        anomaliesFound++;
      }

      // Teleportation check: big distance in very short time
      if (distanceM > 50000 && elapsedS < 300) {
        await supabase.from("gps_fraud_alerts").insert({
          vehicle_id: campaign.vehicle_id,
          alert_type: "teleportation",
          severity: "critical",
          detected_at: curr.recorded_at,
          campaign_request_id: campaign.id,
          point_a: { lat: prev.lat, lng: prev.lng, at: prev.recorded_at },
          point_b: { lat: curr.lat, lng: curr.lng, at: curr.recorded_at },
          computed_speed_kmh: Math.round(speedKmh * 10) / 10,
          distance_m: Math.round(distanceM),
          elapsed_s: Math.round(elapsedS),
          fraud_score: 100,
          resolved: false,
        }).catch(() => null);

        anomaliesFound++;
      }
    }

    if (anomaliesFound > 0) {
      summary.push(`campaign=${campaign.id} anomalies=${anomaliesFound}`);

      // Queue trust score update for the vehicle's driver
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("owner_id")
        .eq("id", campaign.vehicle_id)
        .single();

      if (vehicle?.owner_id) {
        await supabase.from("cq_jobs").insert({
          job_type: "update_trust",
          campaign_request_id: campaign.id,
          vehicle_id: campaign.vehicle_id,
          payload: { driver_user_id: vehicle.owner_id, reason: "gps_anomaly", anomalies: anomaliesFound },
        });

        // Call trust update edge function (best-effort)
        const url = `${SUPABASE_URL}/functions/v1/cq-update-trust`;
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ driver_user_id: vehicle.owner_id }),
        }).catch(() => null);
      }
    }
  }

  // Resolve old GPS alerts that are > 7 days old without action (auto-close)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: autoResolved } = await supabase
    .from("gps_fraud_alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString(), notes: "auto_closed_7d" })
    .eq("resolved", false)
    .eq("severity", "medium")
    .lt("detected_at", sevenDaysAgo)
    .select("id", { count: "exact", head: true });

  if (autoResolved && autoResolved > 0) {
    summary.push(`auto_resolved=${autoResolved} medium_alerts`);
  }

  console.log(`[cq-analyze-gps] date=${analysisDate} | ` + (summary.length ? summary.join(" | ") : "nothing to report"));

  return new Response(
    JSON.stringify({ ok: true, date: analysisDate, summary }),
    { headers: { "Content-Type": "application/json" } }
  );
});
