/**
 * reject-installation — Edge Function (admin only)
 *
 * Rejette la pose soumise par un poseur certifié.
 *
 * Effets :
 *   1. installation_missions.status → 'action_required'
 *   2. installation_missions.rejection_reason → motif admin
 *   3. installation_moderation_queue.status → 'rejected'
 *   4. Crée un pm_job 'installation_rejected'
 *   5. Enqueue email → Poseur (motif + invitation à corriger)
 *
 * Request body:
 *   mission_id         string (UUID)
 *   rejection_reason   string (obligatoire, ≥ 10 chars)
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

  // ── Vérification rôle admin ───────────────────────────────────────────────
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { mission_id: string; rejection_reason: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { mission_id, rejection_reason } = body;
  if (!mission_id) return json({ error: "mission_id is required" }, 422);
  if (!rejection_reason || rejection_reason.trim().length < 10) {
    return json({ error: "rejection_reason must be at least 10 characters" }, 422);
  }

  // ── Charger la mission ────────────────────────────────────────────────────
  const { data: mission, error: missionErr } = await admin
    .from("installation_missions")
    .select(
      `
      id, status, mission_type, campaign_request_id, payee_user_id,
      payee_profiles!payee_id ( user_id, full_name, email )
    `,
    )
    .eq("id", mission_id)
    .single();

  if (missionErr || !mission) return json({ error: "Mission not found" }, 404);

  if (mission.status !== "pending_validation") {
    return json(
      {
        error: `Cannot reject mission with status '${mission.status}'. Expected 'pending_validation'.`,
      },
      409,
    );
  }

  const now = new Date().toISOString();
  const campaignId = mission.campaign_request_id as string;
  const reason = rejection_reason.trim();

  // ── 1. Repasser la mission en action_required ─────────────────────────────
  const { error: updateErr } = await admin
    .from("installation_missions")
    .update({
      status: "action_required",
      rejection_reason: reason,
      admin_notes: reason,
      admin_reviewed_at: now,
      admin_reviewed_by: user.id,
    })
    .eq("id", mission_id);

  if (updateErr) {
    console.error("Failed to reject mission:", updateErr);
    return json({ error: "Failed to update mission status" }, 500);
  }

  // ── 2. Résoudre l'entrée de modération ───────────────────────────────────
  await admin
    .from("installation_moderation_queue")
    .update({
      status: "rejected",
      resolved_by: user.id,
      resolved_at: now,
      resolution_note: reason,
    })
    .eq("mission_id", mission_id);

  // ── 3. pm_job 'installation_rejected' ────────────────────────────────────
  await admin.from("pm_jobs").insert({
    campaign_request_id: campaignId,
    job_type: "installation_rejected",
    status: "pending",
    user_id: mission.payee_user_id,
    payload: {
      mission_id,
      mission_type: mission.mission_type,
      rejection_reason: reason,
      rejected_at: now,
      rejected_by: user.id,
    },
  });

  // ── 4. Email au poseur ────────────────────────────────────────────────────
  const payeeProfile = mission.payee_profiles as {
    user_id: string;
    full_name: string | null;
    email: string | null;
  };

  const poseurEmail = payeeProfile?.email ?? null;
  const poseurName = payeeProfile?.full_name ?? "Poseur";

  if (poseurEmail) {
    await admin.from("email_queue").insert({
      to_email: poseurEmail,
      to_name: poseurName,
      subject: "⚠️ [MoveSpot] Photos refusées — action requise sur votre mission",
      template_id: "poseur_installation_rejected",
      payload: {
        poseur_name: poseurName,
        mission_id,
        campaign_id: campaignId,
        rejection_reason: reason,
        rejected_at: now,
      },
      status: "pending",
    });
  }

  return json({
    ok: true,
    mission_id,
    new_status: "action_required",
    rejected_at: now,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
