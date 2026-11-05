import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UpdateTrustRequest {
  driver_user_id?: string;
  driver_id?: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: UpdateTrustRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Resolve driver_id from driver_user_id if needed
  let driverId = body.driver_id;

  if (!driverId && body.driver_user_id) {
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", body.driver_user_id)
      .maybeSingle();

    driverId = driver?.id;
  }

  if (!driverId) {
    return new Response(
      JSON.stringify({ error: "driver_id or driver_user_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Recompute trust score via DB function (handles all logic)
  const { error: rpcError } = await supabase.rpc("fn_cq_recompute_trust", {
    p_driver_id: driverId,
  });

  if (rpcError) {
    console.error(`[cq-update-trust] rpc error driver=${driverId}`, rpcError);
    return new Response(
      JSON.stringify({ error: rpcError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch updated score for response
  const { data: trustScore } = await supabase
    .from("driver_trust_scores")
    .select("score, gps_anomaly_flags, control_requests_total, control_requests_ok")
    .eq("driver_id", driverId)
    .maybeSingle();

  // Update driver_fraud_scores: count unresolved GPS alerts
  const { count: unresolvedAlerts } = await supabase
    .from("gps_fraud_alerts")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", driverId) // vehicle_id actually refers to vehicle, so we find via vehicles table
    .eq("resolved", false);

  // More accurate: join through vehicles
  const { data: vehicleIds } = await supabase
    .from("vehicles")
    .select("id")
    .eq("owner_id", body.driver_user_id ?? "");

  if (vehicleIds && vehicleIds.length > 0) {
    const ids = vehicleIds.map((v) => v.id);
    const { count: gpsAlerts } = await supabase
      .from("gps_fraud_alerts")
      .select("id", { count: "exact", head: true })
      .in("vehicle_id", ids)
      .eq("resolved", false);

    if (gpsAlerts !== null && gpsAlerts > 0) {
      await supabase
        .from("driver_fraud_scores")
        .upsert(
          {
            driver_id: driverId,
            total_alerts: gpsAlerts,
            last_alert_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "driver_id", ignoreDuplicates: false }
        )
        .catch(() => null);
    }
  }

  // Mark related cq_jobs done
  await supabase
    .from("cq_jobs")
    .update({ status: "done", processed_at: new Date().toISOString() })
    .eq("job_type", "update_trust")
    .eq("payload->>driver_user_id", body.driver_user_id ?? "")
    .eq("status", "pending")
    .catch(() => null);

  console.log(
    `[cq-update-trust] driver=${driverId} reason=${body.reason ?? "manual"} score=${trustScore?.score ?? "?"}`
  );

  return new Response(
    JSON.stringify({
      ok: true,
      driver_id: driverId,
      trust_score: trustScore?.score ?? null,
      reason: body.reason,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
