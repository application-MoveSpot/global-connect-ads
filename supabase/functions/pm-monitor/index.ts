import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];
  const summary: string[] = [];

  // ── 1. Campagnes dont start_date est atteinte mais installation non faite ──
  const { data: overdueInstall } = await supabase
    .from("campaign_requests")
    .select("id")
    .eq("pm_status", "awaiting_installation")
    .eq("payment_status", "paid")
    .lte("start_date", today);

  for (const c of overdueInstall ?? []) {
    await callLifecycle(supabase, c.id, "campaign_start");
    summary.push(`campaign_start incident: ${c.id}`);
  }

  // ── 2. Campagnes actives dont end_date est passée ──────────────────────────
  const { data: endedCampaigns } = await supabase
    .from("campaign_requests")
    .select("id")
    .eq("pm_status", "active")
    .lt("end_date", today);

  for (const c of endedCampaigns ?? []) {
    await callLifecycle(supabase, c.id, "campaign_end");
    summary.push(`campaign_end: ${c.id}`);
  }

  // ── 3. Snapshot de couverture GPS pour les campagnes actives ───────────────
  const { data: activeCampaigns } = await supabase
    .from("campaign_requests")
    .select("id, zone_polygon")
    .eq("pm_status", "active")
    .gte("start_date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]);

  for (const c of activeCampaigns ?? []) {
    if (!c.zone_polygon) continue;

    const { data: coverage } = await supabase.rpc("pm_calc_coverage_rate", {
      p_campaign_id: c.id,
      p_date: today,
    });

    const rate = coverage ?? 0;

    // Upsert snapshot
    await supabase
      .from("pm_coverage_snapshots")
      .upsert({
        campaign_request_id: c.id,
        snapshot_date: today,
        coverage_rate: rate,
      });

    // Incident si taux < 20% sur une journée en cours de campagne
    if (rate < 20) {
      await supabase.from("pm_jobs").insert({
        campaign_request_id: c.id,
        job_type: "coverage_check",
        payload: { rate, date: today, alert: rate < 20 },
      });

      if (rate < 5) {
        await callLifecycle(supabase, c.id, "incident_detected" as never);
        summary.push(`low coverage incident: ${c.id} rate=${rate}`);
      }
    }
  }

  // ── 4. Nettoyer les jobs pm_jobs restés en pending > 2h (timeout) ──────────
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const { count: timedOut } = await supabase
    .from("pm_jobs")
    .update({ status: "error", error_message: "timeout" })
    .eq("status", "pending")
    .lt("created_at", twoHoursAgo)
    .select("id", { count: "exact", head: true });

  if (timedOut && timedOut > 0) {
    summary.push(`timed_out jobs: ${timedOut}`);
  }

  console.log(`[pm-monitor] ${today} | ` + (summary.length ? summary.join(" | ") : "nothing to do"));

  return new Response(
    JSON.stringify({ ok: true, date: today, actions: summary }),
    { headers: { "Content-Type": "application/json" } }
  );
});

async function callLifecycle(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  event: string
): Promise<void> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/pm-lifecycle`;
    const key = SERVICE_ROLE_KEY;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ campaign_id: campaignId, event }),
    });
  } catch {
    // best-effort
  }
}
