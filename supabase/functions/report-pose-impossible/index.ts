/**
 * report-pose-impossible — Art. 15bis CGU / Art. 8bis CGV
 *
 * Called by a certified installer (poseur) when a pose is technically impossible.
 * On owner-fault causes (vehicle_dirty, body_damage, vehicle_absent):
 *   - creates an owner_penalties record (30 €)
 *   - enqueues a warning email to the owner via pgmq transactional_emails queue
 *   - creates a penalty_owner_fault pm_job
 *
 * Always:
 *   - passes mission to failed_technical_impossible
 *   - sets campaign pm_status = incident
 *   - enqueues a refund_pose_impossible pm_job
 *   - emails advertiser and all admins
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

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL        = "noreply@movespot.fr";
const FROM_DOMAIN       = "movespot.fr";

const OWNER_FAULT_CAUSES = new Set(["vehicle_dirty", "body_damage", "vehicle_absent"]);
const PENALTY_AMOUNT_EUR = 30;

const FAULT_CAUSE_LABELS: Record<string, string> = {
  vehicle_dirty:  "Véhicule trop sale",
  body_damage:    "Carrosserie endommagée / Surface incompatible",
  vehicle_absent: "Véhicule absent au rendez-vous",
  other:          "Autre contrainte matérielle",
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

  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    mission_id:  string;
    reason:      string;
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

  // ── Load mission (direct columns, no fragile FK joins) ────────────────────
  const { data: mission, error: missionErr } = await admin
    .from("installation_missions")
    .select("id, status, scheduled_date, pose_impossible_reported_at, payee_user_id, campaign_request_id, fee_cents")
    .eq("id", mission_id)
    .single();

  if (missionErr || !mission) {
    return json({ error: "Mission not found" }, 404);
  }

  // ── Authorisation: only the assigned poseur ───────────────────────────────
  if (mission.payee_user_id !== user.id) {
    return json({ error: "Forbidden: you are not assigned to this mission" }, 403);
  }

  // ── 24h time-lock ─────────────────────────────────────────────────────────
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

  // ── Load campaign + vehicle ───────────────────────────────────────────────
  const { data: campaign } = await admin
    .from("campaign_requests")
    .select("id, user_id, vehicle_id")
    .eq("id", mission.campaign_request_id)
    .single();

  const campaignId       = campaign?.id ?? (mission.campaign_request_id as string);
  const advertiserUserId = campaign?.user_id ?? null;

  // Owner lives on the vehicle (vehicles.owner_id)
  let ownerUserId: string | null = null;
  if (campaign?.vehicle_id) {
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("owner_id")
      .eq("id", campaign.vehicle_id)
      .single();
    ownerUserId = vehicle?.owner_id ?? null;
  }

  // ── Atomic mission update ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("installation_missions")
    .update({
      status:                       "failed_technical_impossible",
      pose_impossible_reason:       reason.trim(),
      pose_impossible_reported_at:  now,
      fault_cause,
    })
    .eq("id", mission_id);

  if (updateErr) {
    console.error("Failed to update mission:", updateErr);
    return json({ error: "Failed to update mission status" }, 500);
  }

  // ── Campaign → incident ───────────────────────────────────────────────────
  await admin
    .from("campaign_requests")
    .update({ pm_status: "incident" })
    .eq("id", campaignId);

  // ── Refund pm_job (critical — hard fail on error) ─────────────────────────
  const { error: pmJobErr } = await admin.from("pm_jobs").insert({
    campaign_request_id: campaignId,
    job_type:            "refund_pose_impossible",
    status:              "pending",
    user_id:             user.id,
    payload: {
      mission_id,
      fault_cause,
      photo_paths,
      reason:      reason.trim(),
      reported_at: now,
    },
  });

  if (pmJobErr) {
    console.error("pm_jobs insert error (refund_pose_impossible):", pmJobErr);
    return json({ error: "Failed to queue refund job", details: pmJobErr.message }, 500);
  }

  // ── Owner-fault path (non-blocking) ──────────────────────────────────────
  if (OWNER_FAULT_CAUSES.has(fault_cause) && ownerUserId) {
    // 1. Penalty record
    const { error: penaltyErr } = await admin.from("owner_penalties").insert({
      owner_user_id:       ownerUserId,
      campaign_request_id: campaignId,
      mission_id,
      fault_cause,
      amount_eur:          PENALTY_AMOUNT_EUR,
      status:              "pending",
    });
    if (penaltyErr) console.error("Failed to create owner penalty:", penaltyErr);

    // 2. Penalty pm_job
    const { error: penaltyJobErr } = await admin.from("pm_jobs").insert({
      campaign_request_id: campaignId,
      job_type:            "penalty_owner_fault",
      status:              "pending",
      user_id:             user.id,
      payload: { owner_user_id: ownerUserId, mission_id, fault_cause, amount_eur: PENALTY_AMOUNT_EUR },
    });
    if (penaltyJobErr) console.error("pm_jobs insert error (penalty_owner_fault):", penaltyJobErr);

    // 3. Owner warning email via pgmq
    const { data: { user: ownerAuth } } = await admin.auth.admin.getUserById(ownerUserId);
    if (ownerAuth?.email) {
      const photoList = photo_paths
        .filter((p) => p.url)
        .map((p, i) => `• Photo ${i + 1} : ${p.url}`)
        .join("<br/>");

      await admin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id:      crypto.randomUUID(),
          to:              ownerAuth.email,
          from:            FROM_EMAIL,
          sender_domain:   FROM_DOMAIN,
          subject:         `[MoveSpot] ⚠️ Avertissement — Pose impossible constatée sur votre véhicule`,
          html:            buildOwnerHtml({ fault_cause, reason: reason.trim(), photoList, campaignId, mission_id, now }),
          text:            `Pose impossible. Cause : ${FAULT_CAUSE_LABELS[fault_cause]}. Raison : ${reason.trim()}. Pénalité : ${PENALTY_AMOUNT_EUR} €.`,
          label:           "owner_fault_warning",
          idempotency_key: `pose-impossible-owner-${mission_id}`,
        },
      });
    }
  }

  // ── Advertiser email (non-blocking) ───────────────────────────────────────
  if (advertiserUserId) {
    const { data: { user: advertiserAuth } } = await admin.auth.admin.getUserById(advertiserUserId);
    if (advertiserAuth?.email) {
      await admin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id:      crypto.randomUUID(),
          to:              advertiserAuth.email,
          from:            FROM_EMAIL,
          sender_domain:   FROM_DOMAIN,
          subject:         `[MoveSpot] ⚠️ Incident — Pose impossible sur votre campagne`,
          html:            buildAdvertiserHtml({ fault_cause, reason: reason.trim(), campaignId, mission_id, now }),
          text:            `Votre campagne a rencontré un incident de pose impossible. Remboursement sous 7 jours ouvrés (CGU Art. 15bis).`,
          label:           "advertiser_pose_impossible",
          idempotency_key: `pose-impossible-advertiser-${mission_id}`,
        },
      });
    }
  }

  // ── Admin broadcast (non-blocking) ────────────────────────────────────────
  const { data: adminRoles } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  for (const adminRow of adminRoles ?? []) {
    const { data: { user: adminAuth } } = await admin.auth.admin.getUserById(adminRow.user_id);
    if (!adminAuth?.email) continue;
    await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id:      crypto.randomUUID(),
        to:              adminAuth.email,
        from:            FROM_EMAIL,
        sender_domain:   FROM_DOMAIN,
        subject:         `[MoveSpot Admin] 🚨 Pose impossible — Mission ${mission_id.slice(0, 8)}`,
        html:            buildAdminHtml({ fault_cause, reason: reason.trim(), campaignId, mission_id, now, poseur_id: user.id }),
        text:            `Pose impossible signalée. Mission : ${mission_id}. Cause : ${FAULT_CAUSE_LABELS[fault_cause]}.`,
        label:           "admin_pose_impossible",
        idempotency_key: `pose-impossible-admin-${mission_id}-${adminRow.user_id}`,
      },
    });
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return json({
    ok:          true,
    mission_id,
    status:      "failed_technical_impossible",
    reported_at: now,
    fault_cause,
    owner_fault: OWNER_FAULT_CAUSES.has(fault_cause),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email templates (minimal HTML)
// ─────────────────────────────────────────────────────────────────────────────

function buildOwnerHtml(p: { fault_cause: string; reason: string; photoList: string; campaignId: string; mission_id: string; now: string }): string {
  return `<h2>⚠️ Pose impossible constatée sur votre véhicule</h2>
<p>Cause constatée : <strong>${FAULT_CAUSE_LABELS[p.fault_cause]}</strong></p>
<p><strong>Détail :</strong> ${p.reason}</p>
<p><strong>Pénalité appliquée :</strong> ${PENALTY_AMOUNT_EUR} € (Art. 8bis CGV)</p>
<p><strong>Campagne :</strong> ${p.campaignId}</p>
<p><strong>Mission :</strong> ${p.mission_id}</p>
<p><strong>Signalé le :</strong> ${new Date(p.now).toLocaleString("fr-FR")}</p>
${p.photoList ? `<p><strong>Preuves photos :</strong><br/>${p.photoList}</p>` : ""}
<p>Contestez via votre espace propriétaire dans les 48 h.</p>`;
}

function buildAdvertiserHtml(p: { fault_cause: string; reason: string; campaignId: string; mission_id: string; now: string }): string {
  return `<h2>⚠️ Incident sur votre campagne publicitaire</h2>
<p>Une pose impossible a été signalée pour votre campagne.</p>
<p><strong>Cause :</strong> ${FAULT_CAUSE_LABELS[p.fault_cause]}</p>
<p><strong>Détail :</strong> ${p.reason}</p>
<p><strong>Campagne :</strong> ${p.campaignId}</p>
<p><strong>Date :</strong> ${new Date(p.now).toLocaleString("fr-FR")}</p>
<p>MoveSpot traite votre remboursement sous <strong>7 jours ouvrés</strong> (CGU Art. 15bis).
Vous serez notifié par email dès que le virement est effectué.</p>`;
}

function buildAdminHtml(p: { fault_cause: string; reason: string; campaignId: string; mission_id: string; now: string; poseur_id: string }): string {
  return `<h2>🚨 Pose impossible signalée</h2>
<table>
<tr><td><strong>Mission</strong></td><td>${p.mission_id}</td></tr>
<tr><td><strong>Campagne</strong></td><td>${p.campaignId}</td></tr>
<tr><td><strong>Poseur UID</strong></td><td>${p.poseur_id}</td></tr>
<tr><td><strong>Cause</strong></td><td>${FAULT_CAUSE_LABELS[p.fault_cause]}</td></tr>
<tr><td><strong>Raison</strong></td><td>${p.reason}</td></tr>
<tr><td><strong>Signalé le</strong></td><td>${new Date(p.now).toLocaleString("fr-FR")}</td></tr>
</table>
<p>✅ Job <code>refund_pose_impossible</code> planifié dans pm_jobs.</p>`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
