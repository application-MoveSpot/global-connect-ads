/**
 * report-pose-impossible — Art. 15bis CGU / Art. 8bis CGV
 *
 * Called by a certified installer (poseur) when a pose is technically impossible.
 * On owner-fault causes (vehicle_dirty, body_damage, vehicle_absent):
 *   - creates an owner_penalties record (30 €)
 *   - enqueues a warning email to the owner via email_queue
 *
 * Request body:
 *   mission_id    string (UUID)
 *   reason        string (≥10 chars)
 *   photo_paths   Array<{ path: string; url: string | null }>  (≥2 required)
 *   fault_cause   "vehicle_dirty" | "body_damage" | "vehicle_absent" | "other"
 *
 * Returns 200 { ok, mission_id, status, reported_at } on success.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OWNER_FAULT_CAUSES = new Set(["vehicle_dirty", "body_damage", "vehicle_absent"]);
const PENALTY_AMOUNT_EUR = 30;

const FAULT_CAUSE_LABELS: Record<string, string> = {
  vehicle_dirty:   "Véhicule trop sale",
  body_damage:     "Carrosserie endommagée / Surface incompatible",
  vehicle_absent:  "Véhicule absent au rendez-vous",
  other:           "Autre contrainte matérielle",
};

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
  const jwt = authHeader.slice(7);

  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(jwt);
  if (authErr || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    mission_id: string;
    reason: string;
    photo_paths: Array<{ path: string; url: string | null }>;
    fault_cause: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { mission_id, reason, photo_paths, fault_cause } = body;

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!mission_id || typeof mission_id !== "string") {
    return json({ error: "mission_id is required" }, 422);
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
    return json({ error: "reason must be at least 10 characters" }, 422);
  }
  if (!Array.isArray(photo_paths) || photo_paths.length < 2) {
    return json({ error: "At least 2 photo_paths are required" }, 422);
  }

  const validCauses = ["vehicle_dirty", "body_damage", "vehicle_absent", "other"];
  if (!fault_cause || !validCauses.includes(fault_cause)) {
    return json({ error: `fault_cause must be one of: ${validCauses.join(", ")}` }, 422);
  }

  // ── Load mission ──────────────────────────────────────────────────────────
  const { data: mission, error: missionErr } = await admin
    .from("installation_missions")
    .select(`
      id, status, scheduled_date, pose_impossible_reported_at, fault_cause,
      payee_profile_id,
      campaign_request_id,
      payee_profiles!inner ( user_id ),
      campaign_requests!inner ( id, advertiser_id, owner_id )
    `)
    .eq("id", mission_id)
    .single();

  if (missionErr || !mission) {
    return json({ error: "Mission not found" }, 404);
  }

  // ── Authorisation: only the assigned poseur ───────────────────────────────
  const payeeProfile = mission.payee_profiles as { user_id: string };
  if (payeeProfile.user_id !== user.id) {
    return json({ error: "Forbidden: you are not assigned to this mission" }, 403);
  }

  // ── 24h time-lock ────────────────────────────────────────────────────────
  if (mission.scheduled_date) {
    const scheduledDay = new Date(mission.scheduled_date as string);
    scheduledDay.setHours(0, 0, 0, 0);
    const deadline = new Date(scheduledDay.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > deadline) {
      return json({ error: "Reporting window closed: more than 24h after scheduled date" }, 422);
    }
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (mission.pose_impossible_reported_at) {
    return json({ error: "Already reported for this mission" }, 409);
  }

  // ── Status guard ──────────────────────────────────────────────────────────
  if (!["assigned", "en_route", "in_progress"].includes(mission.status as string)) {
    return json({ error: `Cannot report on mission with status: ${mission.status}` }, 422);
  }

  // ── Update mission ────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("installation_missions")
    .update({
      status: "failed_technical_impossible",
      pose_impossible_reason: reason.trim(),
      pose_impossible_reported_at: now,
      fault_cause,
    })
    .eq("id", mission_id);

  if (updateErr) {
    console.error("Failed to update mission:", updateErr);
    return json({ error: "Failed to update mission status" }, 500);
  }

  // ── Update campaign pm_status → incident ──────────────────────────────────
  const campaignId = (mission.campaign_requests as { id: string }).id;
  const ownerId = (mission.campaign_requests as { owner_id: string | null }).owner_id;

  await admin
    .from("campaign_requests")
    .update({ pm_status: "incident" })
    .eq("id", campaignId);

  // ── Create pm_job for refund processing ───────────────────────────────────
  await admin.from("pm_jobs").insert({
    campaign_request_id: campaignId,
    job_type: "refund_pose_impossible",
    status: "pending",
    user_id: user.id,
    payload: {
      mission_id,
      fault_cause,
      photo_paths,
      reason: reason.trim(),
      reported_at: now,
    },
  });

  // ── Owner-fault path ──────────────────────────────────────────────────────
  if (OWNER_FAULT_CAUSES.has(fault_cause) && ownerId) {
    // 1. Create owner penalty record
    const { error: penaltyErr } = await admin.from("owner_penalties").insert({
      owner_id: ownerId,
      campaign_request_id: campaignId,
      mission_id,
      fault_cause,
      amount_eur: PENALTY_AMOUNT_EUR,
      status: "pending",
    });

    if (penaltyErr) {
      console.error("Failed to create owner penalty:", penaltyErr);
      // Non-blocking: penalty creation failure does not abort the report
    }

    // 2. Create pm_job for penalty collection
    await admin.from("pm_jobs").insert({
      campaign_request_id: campaignId,
      job_type: "penalty_owner_fault",
      status: "pending",
      user_id: user.id,
      payload: {
        owner_id: ownerId,
        mission_id,
        fault_cause,
        amount_eur: PENALTY_AMOUNT_EUR,
      },
    });

    // 3. Enqueue warning email to owner
    const { data: ownerProfile } = await admin
      .from("payee_profiles")
      .select("full_name, email")
      .eq("user_id", ownerId)
      .maybeSingle();

    const ownerEmail = ownerProfile?.email ?? null;
    const ownerName  = ownerProfile?.full_name ?? "Propriétaire";

    if (ownerEmail) {
      const photoUrlList = photo_paths
        .filter((p) => p.url)
        .map((p, i) => `• Photo ${i + 1} : ${p.url}`)
        .join("\n");

      await admin.from("email_queue").insert({
        to_email:    ownerEmail,
        to_name:     ownerName,
        subject:     `[MoveSpot] ⚠️ Avertissement — Pose impossible constatée sur votre véhicule`,
        template_id: "owner_fault_warning",
        payload: {
          owner_name:        ownerName,
          fault_cause_label: FAULT_CAUSE_LABELS[fault_cause] ?? fault_cause,
          reason:            reason.trim(),
          penalty_amount:    `${PENALTY_AMOUNT_EUR} €`,
          photo_urls:        photoUrlList,
          campaign_id:       campaignId,
          mission_id,
          reported_at:       now,
        },
        status: "pending",
      });
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return json({
    ok: true,
    mission_id,
    status: "failed_technical_impossible",
    reported_at: now,
    fault_cause,
    owner_fault: OWNER_FAULT_CAUSES.has(fault_cause),
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
