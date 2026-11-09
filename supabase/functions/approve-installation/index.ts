/**
 * approve-installation — Edge Function (admin only)
 *
 * Valide la pose soumise par un poseur certifié.
 *
 * Effets :
 *   1. installation_missions.status → 'validated'
 *   2. campaign_requests.installation_status → 'approved'
 *      Le trigger trg_sync_mission_to_campaign + pm trigger auto-set pm_status = 'active'
 *   3. installation_moderation_queue.status → 'approved'
 *   4. Crée un pm_job 'installation_validated' pour déclencher le démarrage de la campagne
 *   5. Enqueue email → Annonceur ("Votre campagne a démarré !")
 *   6. Enqueue email → Propriétaire du véhicule
 *
 * Request body:
 *   mission_id    string (UUID)
 *   admin_notes?  string
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
  let body: { mission_id: string; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { mission_id, admin_notes } = body;
  if (!mission_id) return json({ error: "mission_id is required" }, 422);

  // ── Charger la mission ────────────────────────────────────────────────────
  const { data: mission, error: missionErr } = await admin
    .from("installation_missions")
    .select(
      `
      id, status, mission_type, campaign_request_id, payee_id, payee_user_id,
      payee_profiles!payee_id ( user_id, full_name, email ),
      campaign_requests!campaign_request_id (
        id, installation_status, advertiser_id, owner_id,
        vehicle:vehicles!vehicle_id ( id )
      )
    `,
    )
    .eq("id", mission_id)
    .single();

  if (missionErr || !mission) return json({ error: "Mission not found" }, 404);

  if (mission.status !== "pending_validation") {
    return json(
      {
        error: `Cannot approve mission with status '${mission.status}'. Expected 'pending_validation'.`,
      },
      409,
    );
  }

  const now = new Date().toISOString();
  const campaignId = (mission.campaign_requests as { id: string }).id;
  const advertiserId = (mission.campaign_requests as { advertiser_id: string | null })
    .advertiser_id;
  const ownerId = (mission.campaign_requests as { owner_id: string | null }).owner_id;

  // ── 1. Valider la mission ─────────────────────────────────────────────────
  const { error: updateMissionErr } = await admin
    .from("installation_missions")
    .update({
      status: "validated",
      admin_notes: admin_notes?.trim() ?? null,
      admin_reviewed_at: now,
      admin_reviewed_by: user.id,
      completed_at: now,
    })
    .eq("id", mission_id);

  if (updateMissionErr) {
    console.error("Failed to validate mission:", updateMissionErr);
    return json({ error: "Failed to update mission status" }, 500);
  }

  // ── 2. Passer installation_status → approved ──────────────────────────────
  // Le trigger DB (programme_manager migration) set pm_status = 'active' automatiquement
  await admin
    .from("campaign_requests")
    .update({ installation_status: "approved" })
    .eq("id", campaignId);

  // ── 3. Résoudre l'entrée de modération ───────────────────────────────────
  await admin
    .from("installation_moderation_queue")
    .update({
      status: "approved",
      resolved_by: user.id,
      resolved_at: now,
      resolution_note: admin_notes?.trim() ?? null,
    })
    .eq("mission_id", mission_id);

  // ── 4. pm_job 'installation_validated' ───────────────────────────────────
  await admin.from("pm_jobs").insert({
    campaign_request_id: campaignId,
    job_type: "installation_validated",
    status: "pending",
    user_id: mission.payee_user_id,
    payload: {
      mission_id,
      mission_type: mission.mission_type,
      validated_at: now,
      validated_by: user.id,
    },
  });

  // ── 5. Email Annonceur ────────────────────────────────────────────────────
  if (advertiserId) {
    const { data: advProfile } = await admin
      .from("advertiser_profiles")
      .select("full_name, email")
      .eq("user_id", advertiserId)
      .maybeSingle();

    if (advProfile?.email) {
      await admin.from("email_queue").insert({
        to_email: advProfile.email,
        to_name: advProfile.full_name ?? "Annonceur",
        subject: "🚀 [MoveSpot] Votre campagne a démarré !",
        template_id: "advertiser_campaign_started",
        payload: {
          advertiser_name: advProfile.full_name ?? "Annonceur",
          campaign_id: campaignId,
          started_at: now,
        },
        status: "pending",
      });
    }
  }

  // ── 6. Email Propriétaire du véhicule ─────────────────────────────────────
  if (ownerId) {
    const { data: ownerProfile } = await admin
      .from("owner_profiles")
      .select("full_name, email")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (ownerProfile?.email) {
      await admin.from("email_queue").insert({
        to_email: ownerProfile.email,
        to_name: ownerProfile.full_name ?? "Propriétaire",
        subject: "✅ [MoveSpot] La pose sur votre véhicule a été validée",
        template_id: "owner_installation_approved",
        payload: {
          owner_name: ownerProfile.full_name ?? "Propriétaire",
          campaign_id: campaignId,
          approved_at: now,
        },
        status: "pending",
      });
    }
  }

  // ── 7. Générer la facture PDF (fire-and-forget) ───────────────────────────
  if (advertiserId) {
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-invoice-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ campaign_id: campaignId, advertiser_id: advertiserId }),
    }).catch((e) => console.error("Invoice generation failed (non-blocking):", e));
  }

  return json({
    ok: true,
    mission_id,
    new_status: "validated",
    approved_at: now,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
