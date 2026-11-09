/**
 * ingest-gps-coordinates — Edge Function
 *
 * Reçoit un point GPS d'un chauffeur et l'insère dans vehicle_positions.
 * Met à jour la dernière position connue sur le véhicule.
 *
 * Request body:
 *   vehicle_id           string (UUID)
 *   campaign_request_id  string (UUID)
 *   lat                  number
 *   lng                  number
 *   speed?               number  (m/s)
 *   heading?             number  (degrés, 0–360)
 *   accuracy?            number  (mètres)
 *   recorded_at?         string  (ISO 8601, défaut : now())
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    vehicle_id: string;
    campaign_request_id: string;
    lat: number;
    lng: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    recorded_at?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { vehicle_id, campaign_request_id, lat, lng, speed, heading, accuracy, recorded_at } = body;

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!vehicle_id || typeof vehicle_id !== "string") {
    return json({ error: "vehicle_id is required" }, 422);
  }
  if (!campaign_request_id || typeof campaign_request_id !== "string") {
    return json({ error: "campaign_request_id is required" }, 422);
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return json({ error: "lat and lng must be numbers" }, 422);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json({ error: "Invalid GPS coordinates" }, 422);
  }

  // ── Vérifier que la campagne est active ───────────────────────────────────
  const { data: campaign, error: campaignErr } = await admin
    .from("campaign_requests")
    .select("id, pm_status, advertiser_id, owner_id")
    .eq("id", campaign_request_id)
    .maybeSingle();

  if (campaignErr || !campaign) {
    return json({ error: "Campaign not found" }, 404);
  }

  if (campaign.pm_status !== "active") {
    return json(
      {
        error: `Campaign is not active (current status: '${campaign.pm_status}'). GPS ingestion is only allowed for active campaigns.`,
      },
      409,
    );
  }

  // ── Vérifier que le véhicule existe et appartient à l'owner de la campagne ─
  const { data: vehicle, error: vehicleErr } = await admin
    .from("vehicles")
    .select("id, owner_id")
    .eq("id", vehicle_id)
    .maybeSingle();

  if (vehicleErr || !vehicle) {
    return json({ error: "Vehicle not found" }, 404);
  }

  const now = new Date().toISOString();
  const posRecordedAt = recorded_at ?? now;

  // ── Insérer le point GPS ──────────────────────────────────────────────────
  const { error: insertErr } = await admin.from("vehicle_positions").insert({
    vehicle_id,
    campaign_request_id,
    owner_id: vehicle.owner_id,
    lat,
    lng,
    speed: speed ?? null,
    heading: heading ?? null,
    accuracy: accuracy ?? null,
    recorded_at: posRecordedAt,
  });

  if (insertErr) {
    console.error("Failed to insert GPS point:", insertErr);
    return json({ error: "Failed to store GPS point" }, 500);
  }

  // ── Mettre à jour la dernière position connue sur le véhicule ─────────────
  const { error: updateErr } = await admin
    .from("vehicles")
    .update({
      last_position_at: posRecordedAt,
      last_lat: lat,
      last_lng: lng,
    })
    .eq("id", vehicle_id);

  if (updateErr) {
    // Non-bloquant : le point est déjà inséré
    console.error("Failed to update vehicle last position:", updateErr);
  }

  return json({
    ok: true,
    vehicle_id,
    campaign_request_id,
    recorded_at: posRecordedAt,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
