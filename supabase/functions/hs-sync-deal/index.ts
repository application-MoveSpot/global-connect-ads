import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HS_TOKEN = Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN")!;
const HS_BASE = "https://api.hubapi.com";

interface SyncDealRequest {
  campaign_id: string;
  event?: "created" | "updated" | "won" | "lost";
}

const PM_STATUS_TO_STAGE: Record<string, string> = {
  idle: "appointmentscheduled",
  awaiting_installation: "qualifiedtobuy",
  active: "presentationscheduled",
  completing: "decisionmakerboughtin",
  completed: "closedwon",
  incident: "closedlost",
};

async function hsRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${HS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HS_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body: SyncDealRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!body.campaign_id) {
    return new Response(
      JSON.stringify({ error: "campaign_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: campaign, error: campErr } = await supabase
    .from("campaign_requests")
    .select("id, company, spot_name, total_price, pm_status, status, start_date, end_date, user_id, email")
    .eq("id", body.campaign_id)
    .single();

  if (campErr || !campaign) {
    return new Response(
      JSON.stringify({ error: "campaign not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const dealStage = PM_STATUS_TO_STAGE[campaign.pm_status ?? "idle"] ?? "appointmentscheduled";
  const amountEuros = campaign.total_price != null ? String(campaign.total_price) : "0";

  const dealProperties: Record<string, string> = {
    dealname: `${campaign.company} — ${campaign.spot_name}`,
    dealstage: dealStage,
    amount: amountEuros,
    movespot_campaign_id: campaign.id,
    movespot_pm_status: campaign.pm_status ?? "idle",
    movespot_start_date: campaign.start_date ?? "",
    movespot_end_date: campaign.end_date ?? "",
  };
  if (campaign.end_date) {
    dealProperties.closedate = new Date(campaign.end_date).getTime().toString();
  }

  const { data: syncLog } = await supabase
    .from("hs_sync_log")
    .select("hubspot_id")
    .eq("object_type", "deal")
    .eq("supabase_id", campaign.id)
    .maybeSingle();

  let hubspotId = syncLog?.hubspot_id ?? null;
  let syncStatus = "ok";
  let errorMessage: string | null = null;

  try {
    if (hubspotId) {
      await hsRequest(`/crm/v3/objects/deals/${hubspotId}`, "PATCH", { properties: dealProperties });
    } else {
      const created = await hsRequest("/crm/v3/objects/deals", "POST", { properties: dealProperties });
      hubspotId = created.id;
    }

    // Associer le deal au contact correspondant (best-effort)
    if (hubspotId && campaign.user_id) {
      const { data: contactLog } = await supabase
        .from("hs_sync_log")
        .select("hubspot_id")
        .eq("object_type", "contact")
        .eq("supabase_id", campaign.user_id)
        .maybeSingle();

      if (contactLog?.hubspot_id) {
        await hsRequest("/crm/v4/associations/deals/contacts/batch/create", "POST", {
          inputs: [{
            from: { id: hubspotId },
            to: { id: contactLog.hubspot_id },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
          }],
        }).catch(() => null);
      } else {
        // Synchro du contact en parallèle si pas encore dans le log
        fetch(`${SUPABASE_URL}/functions/v1/hs-sync-contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ user_id: campaign.user_id }),
        }).catch(() => null);
      }
    }
  } catch (err) {
    syncStatus = "error";
    errorMessage = String(err);
    console.error(`[hs-sync-deal] campaign=${campaign.id}`, err);
  }

  await supabase
    .from("hs_sync_log")
    .upsert(
      {
        object_type: "deal",
        supabase_id: campaign.id,
        hubspot_id: hubspotId,
        sync_status: syncStatus,
        error_message: errorMessage,
        synced_at: syncStatus === "ok" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "object_type,supabase_id" }
    )
    .catch(() => null);

  console.log(`[hs-sync-deal] campaign=${campaign.id} hs_id=${hubspotId} stage=${dealStage} status=${syncStatus}`);

  return new Response(
    JSON.stringify({ ok: syncStatus === "ok", hubspot_id: hubspotId, deal_stage: dealStage }),
    { headers: { "Content-Type": "application/json" } }
  );
});
