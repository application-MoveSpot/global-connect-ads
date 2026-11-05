import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type PmEvent =
  | "payment_confirmed"
  | "installation_validated"
  | "depose_validated"
  | "campaign_start"
  | "campaign_end";

interface Request {
  campaign_id: string;
  event: PmEvent;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Request;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { campaign_id, event } = body;
  if (!campaign_id || !event) {
    return new Response("Missing campaign_id or event", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaign_requests")
    .select(
      "id, pm_status, payment_status, installation_status, depose_status, start_date, end_date, vehicle_id, user_id, owner_amount_cents, pose_fee_cents, depose_fee_cents, pose_installer_user_id, depose_installer_user_id, pose_payout_status, depose_payout_status, payout_status"
    )
    .eq("id", campaign_id)
    .single();

  if (campErr || !campaign) {
    return new Response(JSON.stringify({ error: "Campaign not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const updates: Record<string, unknown> = {};
  const log: string[] = [`[pm-lifecycle] campaign=${campaign_id} event=${event}`];

  switch (event) {
    case "payment_confirmed": {
      // Notify owner to proceed with installation
      updates.pm_status = "awaiting_installation";
      log.push("→ awaiting_installation");

      // Send notification to owner (best-effort via notifications table if it exists)
      await supabase.from("notifications").insert({
        user_id: await resolveOwnerId(supabase, campaign.vehicle_id),
        type: "campaign_installation_requested",
        payload: { campaign_id },
      }).throwOnError().catch(() => null);
      break;
    }

    case "installation_validated": {
      updates.pm_status = "active";
      log.push("→ active");

      // Release pose installer payment (tranche 1 : 10% = pose_fee_cents)
      if (campaign.pose_payout_status !== "transferred" && campaign.pose_fee_cents > 0) {
        updates.pose_payout_status = "pending_transfer";
        log.push("pose payout queued");
      }

      // Notify advertiser campaign is live
      await supabase.from("notifications").insert({
        user_id: campaign.user_id,
        type: "campaign_live",
        payload: { campaign_id },
      }).throwOnError().catch(() => null);
      break;
    }

    case "depose_validated": {
      updates.pm_status = "completed";
      log.push("→ completed");

      // Release depose installer payment
      if (campaign.depose_payout_status !== "transferred" && (campaign.depose_fee_cents ?? 0) > 0) {
        updates.depose_payout_status = "pending_transfer";
      }

      // Final owner payout trigger
      if (campaign.payout_status !== "transferred") {
        updates.payout_status = "pending_transfer";
        log.push("owner payout queued");
      }

      // Notify advertiser
      await supabase.from("notifications").insert({
        user_id: campaign.user_id,
        type: "campaign_completed",
        payload: { campaign_id },
      }).throwOnError().catch(() => null);
      break;
    }

    case "campaign_start": {
      if (campaign.pm_status === "awaiting_installation") {
        updates.pm_status = "incident";
        log.push("→ incident: start_date reached without installation");

        await supabase.from("notifications").insert({
          user_id: await resolveOwnerId(supabase, campaign.vehicle_id),
          type: "campaign_installation_overdue",
          payload: { campaign_id },
        }).throwOnError().catch(() => null);
      }
      break;
    }

    case "campaign_end": {
      if (campaign.pm_status === "active") {
        updates.pm_status = "completing";
        log.push("→ completing: end_date reached");

        await supabase.from("notifications").insert({
          user_id: await resolveOwnerId(supabase, campaign.vehicle_id),
          type: "campaign_depose_requested",
          payload: { campaign_id },
        }).throwOnError().catch(() => null);
      }
      break;
    }
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase
      .from("campaign_requests")
      .update(updates)
      .eq("id", campaign_id);

    if (updateErr) {
      log.push(`UPDATE ERROR: ${updateErr.message}`);
    }
  }

  // Mark pm_job as done
  await supabase
    .from("pm_jobs")
    .update({ status: "done", processed_at: new Date().toISOString() })
    .eq("campaign_request_id", campaign_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  console.log(log.join(" | "));
  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function resolveOwnerId(
  supabase: ReturnType<typeof createClient>,
  vehicleId: string | null
): Promise<string | null> {
  if (!vehicleId) return null;
  const { data } = await supabase
    .from("vehicles")
    .select("owner_id")
    .eq("id", vehicleId)
    .single();
  return data?.owner_id ?? null;
}
