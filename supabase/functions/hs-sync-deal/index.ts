import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") ?? "";
const HUBSPOT_API = "https://api.hubapi.com";

const PM_STATUS_TO_STAGE: Record<string, string> = {
  idle: "1480498275",                // Réunion d'introduction
  awaiting_installation: "1480498276", // Évaluation de la campagne
  active: "1480498277",              // Proposition de stratégie
  completing: "1480498278",          // Présentation de stratégie
  completed: "1480498281",           // Fermée gagnée
  incident: "1480498282",            // Fermée perdue
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body: { campaign_id?: string; event?: string };
    try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!HUBSPOT_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "HUBSPOT_API_KEY not set" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: campaign, error: campErr } = await supabase
      .from("campaign_requests")
      .select("id, company, spot_name, total_price, pm_status, start_date, end_date, user_id, email, target_region")
      .eq("id", body.campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "campaign not found", detail: campErr?.message }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const dealStage = PM_STATUS_TO_STAGE[campaign.pm_status ?? "idle"] ?? "1480498275";

    // Look up existing HubSpot deal ID (for upsert)
    let hubspotDealId = "";
    try {
      const { data: dealLog } = await supabase
        .from("hs_sync_log")
        .select("hubspot_id")
        .eq("object_type", "deal")
        .eq("supabase_id", campaign.id)
        .maybeSingle();
      hubspotDealId = (dealLog as { hubspot_id?: string } | null)?.hubspot_id ?? "";
    } catch { /* no deal log yet */ }

    // Look up HubSpot contact ID for association
    let hubspotContactId = "";
    try {
      const { data: contactLog } = await supabase
        .from("hs_sync_log")
        .select("hubspot_id")
        .eq("object_type", "contact")
        .eq("supabase_id", campaign.user_id)
        .maybeSingle();
      hubspotContactId = (contactLog as { hubspot_id?: string } | null)?.hubspot_id ?? "";
    } catch { /* no contact log yet */ }

    // Build HubSpot deal properties
    const dealProperties: Record<string, string> = {
      dealname: `${campaign.company ?? ""} — ${campaign.spot_name ?? ""}`,
      dealstage: dealStage,
      pipeline: "default",
    };
    if (campaign.total_price != null) {
      dealProperties.amount = String(campaign.total_price);
    }
    if (campaign.end_date) {
      try { dealProperties.closedate = String(new Date(campaign.end_date).getTime()); } catch { /* skip */ }
    }

    // Mark sync as pending
    try {
      await supabase.from("hs_sync_log").upsert(
        { object_type: "deal", supabase_id: campaign.id, sync_status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "object_type,supabase_id" }
      );
    } catch { /* ignore */ }

    const isCreate = !hubspotDealId;
    let hsRes: Response | null = null;

    try {
      if (hubspotDealId) {
        // Update existing deal (PATCH)
        hsRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals/${hubspotDealId}`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${HUBSPOT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: dealProperties }),
        });
      } else {
        // Create new deal (POST)
        hsRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${HUBSPOT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: dealProperties }),
        });
      }
    } catch (e) {
      console.error(`[hs-sync-deal] HubSpot fetch failed: ${e}`);
    }

    const hsOk = hsRes?.ok ?? false;
    let hsBodyText = "";
    try { hsBodyText = await (hsRes?.text() ?? ""); } catch {}

    let newDealId = hubspotDealId;

    if (isCreate && hsOk) {
      try {
        const created = JSON.parse(hsBodyText) as { id?: string };
        newDealId = created.id ?? "";
        // Associate deal with contact (best-effort, type 3 = deal_to_contact)
        if (newDealId && hubspotContactId) {
          try {
            await fetch(`${HUBSPOT_API}/crm/v3/objects/deals/${newDealId}/associations/contacts/${hubspotContactId}/3`, {
              method: "PUT",
              headers: { "Authorization": `Bearer ${HUBSPOT_API_KEY}` },
            });
          } catch { /* association is best-effort */ }
        }
      } catch { /* can't parse response body */ }
    }

    // Update sync log with result
    try {
      const updateData: Record<string, unknown> = {
        sync_status: hsOk ? "ok" : "error",
        error_message: hsOk ? null : `HS ${hsRes?.status ?? "??"}: ${hsBodyText.slice(0, 200)}`,
        synced_at: hsOk ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (hsOk && newDealId) updateData.hubspot_id = newDealId;
      await supabase.from("hs_sync_log").update(updateData)
        .eq("object_type", "deal").eq("supabase_id", campaign.id);
    } catch { /* ignore */ }

    console.log(`[hs-sync-deal] done | campaign=${campaign.id} stage=${dealStage} hs_ok=${hsOk} deal_id=${newDealId} action=${isCreate ? "created" : "updated"}`);
    return new Response(JSON.stringify({
      ok: hsOk,
      deal_stage: dealStage,
      hubspot_deal_id: newDealId,
      action: isCreate ? "created" : "updated",
      hs_status: hsRes?.status ?? null,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(`[hs-sync-deal] UNCAUGHT: ${err}`);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
