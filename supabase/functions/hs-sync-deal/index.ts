import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAKE_WEBHOOK_DEAL = Deno.env.get("MAKE_WEBHOOK_DEAL_URL") ?? "";

const PM_STATUS_TO_STAGE: Record<string, string> = {
  idle: "appointmentscheduled",
  awaiting_installation: "qualifiedtobuy",
  active: "presentationscheduled",
  completing: "decisionmakerboughtin",
  completed: "closedwon",
  incident: "closedlost",
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body: { campaign_id?: string; event?: string };
    try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
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

    const dealStage = PM_STATUS_TO_STAGE[campaign.pm_status ?? "idle"] ?? "appointmentscheduled";

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

    const payload = {
      event: body.event ?? "updated",
      campaign_id: campaign.id,
      deal_name: `${campaign.company ?? ""} — ${campaign.spot_name ?? ""}`,
      deal_stage: dealStage,
      pm_status: campaign.pm_status ?? "idle",
      amount: campaign.total_price ?? 0,
      start_date: campaign.start_date ?? "",
      end_date: campaign.end_date ?? "",
      target_region: campaign.target_region ?? "",
      advertiser_email: campaign.email ?? "",
      advertiser_user_id: campaign.user_id ?? "",
      hubspot_contact_id: hubspotContactId,
      supabase_url: SUPABASE_URL,
    };

    try {
      await supabase.from("hs_sync_log").upsert(
        { object_type: "deal", supabase_id: campaign.id, sync_status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "object_type,supabase_id" }
      );
    } catch { /* ignore */ }

    if (!MAKE_WEBHOOK_DEAL) {
      return new Response(JSON.stringify({ ok: false, error: "MAKE_WEBHOOK_DEAL_URL not set" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    let makeRes: Response | null = null;
    try {
      makeRes = await fetch(MAKE_WEBHOOK_DEAL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error(`[hs-sync-deal] fetch failed: ${e}`);
    }

    const makeOk = makeRes?.ok ?? false;

    try {
      await supabase.from("hs_sync_log").update({
        sync_status: makeOk ? "ok" : "error",
        error_message: makeOk ? null : "Make webhook call failed",
        synced_at: makeOk ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("object_type", "deal").eq("supabase_id", campaign.id);
    } catch { /* ignore */ }

    console.log(`[hs-sync-deal] done | campaign=${campaign.id} stage=${dealStage} make_ok=${makeOk}`);
    return new Response(JSON.stringify({ ok: makeOk, deal_stage: dealStage, make_status: makeRes?.status ?? null }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(`[hs-sync-deal] UNCAUGHT: ${err}`);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
