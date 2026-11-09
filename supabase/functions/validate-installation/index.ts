/**
 * validate-installation — Edge Function
 *
 * Called by a certified installer (poseur) to submit the 4 mandatory
 * installation photos and transition the mission to pending_validation.
 *
 * Required photos (all 4 must be present):
 *   face_avant, face_arriere, profil_gauche, profil_droit
 *
 * Side effects:
 *   - Inserts 4 mission_proofs records
 *   - Sets installation_missions.status = 'pending_validation'
 *   - The trigger trg_sync_mission_to_campaign automatically sets
 *     campaign_requests.installation_status = 'pending_approval'
 *   - Inserts a moderation_alerts record for the admin dashboard
 *   - Enqueues an admin email via email_queue
 *
 * Request body:
 *   mission_id    string (UUID)
 *   photos        Array<{ proof_type: string; storage_path: string; storage_url: string | null }>
 *   provider_notes? string
 *
 * Returns 200 { ok, mission_id, status } on success.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const REQUIRED_PROOF_TYPES = [
  "face_avant",
  "face_arriere",
  "profil_gauche",
  "profil_droit",
] as const;

const PROOF_TYPE_LABELS: Record<string, string> = {
  face_avant: "Face avant",
  face_arriere: "Face arrière",
  profil_gauche: "Profil gauche",
  profil_droit: "Profil droit",
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

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    mission_id: string;
    photos: Array<{ proof_type: string; storage_path: string; storage_url: string | null }>;
    provider_notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { mission_id, photos, provider_notes } = body;

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!mission_id || typeof mission_id !== "string") {
    return json({ error: "mission_id is required" }, 422);
  }
  if (!Array.isArray(photos) || photos.length !== 4) {
    return json({ error: "Exactly 4 photos are required" }, 422);
  }

  const submittedTypes = new Set(photos.map((p) => p.proof_type));
  const missingTypes = REQUIRED_PROOF_TYPES.filter((t) => !submittedTypes.has(t));
  if (missingTypes.length > 0) {
    return json({ error: `Missing required photo types: ${missingTypes.join(", ")}` }, 422);
  }

  for (const photo of photos) {
    if (!photo.storage_path || typeof photo.storage_path !== "string") {
      return json({ error: "Each photo must have a storage_path" }, 422);
    }
  }

  // ── Load mission ──────────────────────────────────────────────────────────
  const { data: mission, error: missionErr } = await admin
    .from("installation_missions")
    .select(
      `
      id, status, mission_type, campaign_request_id, payee_user_id, payee_id,
      payee_profiles!inner ( user_id, full_name )
    `,
    )
    .eq("id", mission_id)
    .single();

  if (missionErr || !mission) {
    return json({ error: "Mission not found" }, 404);
  }

  // ── Authorisation: only the assigned poseur ───────────────────────────────
  const payeeProfile = mission.payee_profiles as { user_id: string; full_name: string };
  if (payeeProfile.user_id !== user.id) {
    return json({ error: "Forbidden: you are not assigned to this mission" }, 403);
  }

  // ── Status guard ──────────────────────────────────────────────────────────
  if (mission.status !== "in_progress") {
    return json(
      {
        error: `Cannot submit validation from status '${mission.status}'. Expected 'in_progress'.`,
      },
      409,
    );
  }

  const now = new Date().toISOString();

  // ── Insert mission_proofs ─────────────────────────────────────────────────
  const proofRows = photos.map((p) => ({
    mission_id,
    proof_type: p.proof_type,
    storage_path: p.storage_path,
    storage_url: p.storage_url ?? null,
    uploaded_by: user.id,
  }));

  const { error: proofErr } = await admin.from("mission_proofs").insert(proofRows);

  if (proofErr) {
    console.error("Failed to insert mission proofs:", proofErr);
    return json({ error: "Failed to store photos" }, 500);
  }

  // ── Update mission status → pending_validation ────────────────────────────
  // The trigger trg_sync_mission_to_campaign will automatically set
  // campaign_requests.installation_status = 'pending_approval'
  const { error: updateErr } = await admin
    .from("installation_missions")
    .update({
      status: "pending_validation",
      provider_notes: provider_notes?.trim() ?? null,
      validation_submitted_at: now,
    })
    .eq("id", mission_id);

  if (updateErr) {
    console.error("Failed to update mission status:", updateErr);
    // Rollback proof inserts
    await admin
      .from("mission_proofs")
      .delete()
      .eq("mission_id", mission_id)
      .in("proof_type", REQUIRED_PROOF_TYPES);
    return json({ error: "Failed to update mission status" }, 500);
  }

  // ── Create moderation_alerts record for admin ─────────────────────────────
  const photoSummary = photos
    .map(
      (p) =>
        `${PROOF_TYPE_LABELS[p.proof_type] ?? p.proof_type}: ${p.storage_url ?? p.storage_path}`,
    )
    .join("\n");

  await admin.from("moderation_alerts").insert({
    alert_type: "installation_validation_pending",
    campaign_request_id: mission.campaign_request_id,
    mission_id,
    payload: {
      poseur_name: payeeProfile.full_name,
      mission_type: mission.mission_type,
      photos,
      photo_summary: photoSummary,
      submitted_at: now,
      provider_notes: provider_notes?.trim() ?? null,
    },
    resolved: false,
    created_at: now,
  });

  // ── Enqueue admin notification email ──────────────────────────────────────
  const { data: adminEmails } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (adminEmails && adminEmails.length > 0) {
    const photoLinks = photos
      .filter((p) => p.storage_url)
      .map((p) => `• ${PROOF_TYPE_LABELS[p.proof_type] ?? p.proof_type} : ${p.storage_url}`)
      .join("\n");

    const emailInserts = adminEmails.map((row: { user_id: string }) => ({
      to_email: null,
      to_user_id: row.user_id,
      subject: `[MoveSpot] 📸 Nouvelle pose à modérer — Mission #${mission_id.slice(0, 8)}`,
      template_id: "admin_installation_validation",
      payload: {
        mission_id,
        campaign_request_id: mission.campaign_request_id,
        poseur_name: payeeProfile.full_name,
        mission_type: mission.mission_type,
        photo_links: photoLinks,
        provider_notes: provider_notes?.trim() ?? "(aucune note)",
        submitted_at: now,
      },
      status: "pending",
    }));

    await admin.from("email_queue").insert(emailInserts);
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return json({
    ok: true,
    mission_id,
    status: "pending_validation",
    submitted_at: now,
    proofs_inserted: photos.length,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
