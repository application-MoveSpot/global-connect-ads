import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ValidatePhotoRequest {
  photo_request_id?: string;
  campaign_id?: string;
  photo_type?: "installation" | "depose" | "control";
  photos?: unknown[];
}

// GPS distance in meters (Haversine)
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

interface FraudFlags {
  no_gps: boolean;
  low_accuracy: boolean;
  gps_far_from_zone: boolean;
  null_island: boolean;
  fraud_score: number;
}

function computeFraudFlags(
  photoLat: number | null,
  photoLng: number | null,
  photoAccuracy: number | null,
  zoneLat?: number | null,
  zoneLng?: number | null
): FraudFlags {
  const flags: FraudFlags = {
    no_gps: false,
    low_accuracy: false,
    gps_far_from_zone: false,
    null_island: false,
    fraud_score: 0,
  };

  if (!photoLat || !photoLng) {
    flags.no_gps = true;
    flags.fraud_score += 40;
    return flags;
  }

  if (Math.abs(photoLat) < 0.001 && Math.abs(photoLng) < 0.001) {
    flags.null_island = true;
    flags.fraud_score += 80;
  }

  if (photoAccuracy && photoAccuracy > 100) {
    flags.low_accuracy = true;
    flags.fraud_score += 20;
  }

  if (zoneLat && zoneLng) {
    const dist = haversineMeters(photoLat, photoLng, zoneLat, zoneLng);
    if (dist > 2000) {
      flags.gps_far_from_zone = true;
      flags.fraud_score += Math.min(60, Math.floor(dist / 100));
    }
  }

  return flags;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: ValidatePhotoRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const log: string[] = [];

  // ── Path A : control_photo_requests record ──────────────────────────────
  if (body.photo_request_id) {
    const { data: pr, error: prErr } = await supabase
      .from("control_photo_requests")
      .select("*")
      .eq("id", body.photo_request_id)
      .single();

    if (prErr || !pr) {
      return new Response(JSON.stringify({ error: "photo_request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve zone center from campaign
    let zoneLat: number | null = null;
    let zoneLng: number | null = null;
    if (pr.campaign_request_id) {
      const { data: cr } = await supabase
        .from("campaign_requests")
        .select("spot_location")
        .eq("id", pr.campaign_request_id)
        .single();
      // spot_location format: "lat,lng" string
      if (cr?.spot_location) {
        const parts = String(cr.spot_location).split(",");
        if (parts.length === 2) {
          zoneLat = parseFloat(parts[0]);
          zoneLng = parseFloat(parts[1]);
        }
      }
    }

    const flags = computeFraudFlags(pr.photo_lat, pr.photo_lng, pr.photo_accuracy, zoneLat, zoneLng);
    const fraudScore = flags.fraud_score;
    const isSuspicious = fraudScore >= 40;
    const newCqStatus = isSuspicious ? "needs_human_review" : "auto_validated";

    await supabase
      .from("control_photo_requests")
      .update({
        cq_status: newCqStatus,
        cq_fraud_score: fraudScore,
        cq_checked_at: new Date().toISOString(),
        fraud_flags: flags,
        admin_validated: !isSuspicious,
      })
      .eq("id", pr.id);

    log.push(`photo_request=${pr.id} cq_status=${newCqStatus} fraud_score=${fraudScore}`);

    // If auto-validated → update campaign installation/depose status
    if (!isSuspicious && pr.campaign_request_id) {
      const photoType = pr.photo_type ?? "control";

      if (photoType === "installation") {
        await supabase
          .from("campaign_requests")
          .update({ installation_status: "approved" })
          .eq("id", pr.campaign_request_id)
          .neq("installation_status", "approved");
        log.push(`→ installation_status=approved for campaign=${pr.campaign_request_id}`);
      } else if (photoType === "depose") {
        await supabase
          .from("campaign_requests")
          .update({ depose_status: "approved" })
          .eq("id", pr.campaign_request_id)
          .neq("depose_status", "approved");
        log.push(`→ depose_status=approved for campaign=${pr.campaign_request_id}`);
      }

      // Update driver trust score
      if (pr.driver_id) {
        await supabase.rpc("fn_cq_recompute_trust", { p_driver_id: pr.driver_id });
      }
    }

    // If suspicious → create moderation alert
    if (isSuspicious) {
      await supabase.from("moderation_alerts").insert({
        intent: "photo_fraud_suspected",
        severity: fraudScore / 100,
        flags: Object.keys(flags).filter((k) => k !== "fraud_score" && (flags as Record<string, unknown>)[k] === true),
        suggested_action: fraudScore >= 70 ? "reject_and_warn" : "human_review",
        reviewed: false,
        brief_id: null,
        message_id: null,
        conversation_id: null,
        sender_id: pr.driver_id,
      }).catch(() => null);

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: null,
        type: "photo_fraud_flagged",
        payload: { photo_request_id: pr.id, campaign_id: pr.campaign_request_id, fraud_score: fraudScore, flags },
      }).catch(() => null);

      log.push(`→ fraud flagged for review (score=${fraudScore})`);
    }

    // Mark cq_job done
    await supabase
      .from("cq_jobs")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("photo_request_id", pr.id)
      .eq("status", "pending");
  }

  // ── Path B : campaign_requests direct photos ────────────────────────────
  if (body.campaign_id && body.photo_type && !body.photo_request_id) {
    const photoType = body.photo_type;
    log.push(`campaign=${body.campaign_id} photo_type=${photoType}`);

    // For direct campaign photos (no photo_request), just validate without GPS check
    // and approve the corresponding status (admin will review photos manually)
    // CQ marks it as needing review for now
    await supabase.from("cq_jobs").insert({
      job_type: "validate_photo",
      campaign_request_id: body.campaign_id,
      payload: {
        photo_type: photoType,
        photos: body.photos ?? [],
        note: "direct_campaign_photo_needs_review",
      },
      status: "done",
      processed_at: new Date().toISOString(),
    });

    log.push(`→ queued for admin review`);
  }

  console.log(`[cq-validate-photo] ` + (log.join(" | ") || "nothing to do"));

  return new Response(
    JSON.stringify({ ok: true, log }),
    { headers: { "Content-Type": "application/json" } }
  );
});
