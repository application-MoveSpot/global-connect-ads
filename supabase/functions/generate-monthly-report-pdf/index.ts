/**
 * generate-monthly-report-pdf — Edge Function
 *
 * Deux modes :
 *   Single  — corps { campaign_id, period? }  → rapport pour une campagne
 *   Batch   — corps {} ou sans campaign_id    → rapport pour toutes les campagnes
 *             actives du mois précédent (déclenché par pg_cron)
 *
 * Auth : x-internal-secret  OU  Bearer JWT admin
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const INTERNAL_SECRET  = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const MOVESPOT = {
  name:  "MoveSpot SAS",
  email: "rapports@movespot.fr",
  site:  "movespot.fr",
};

// ── Résultat d'une génération ─────────────────────────────────────────────────
interface ReportResult {
  ok: boolean;
  stats_id?: string;
  pdf_url?: string;
  already_exists?: boolean;
  error?: string;
}

// ── Utilitaire : mois précédent au format "YYYY-MM" ──────────────────────────
export function getPrevMonthPeriod(): string {
  const now = new Date();
  const d   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const internalSecret = req.headers.get("x-internal-secret");
  const authHeader     = req.headers.get("Authorization");
  const admin          = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (internalSecret && internalSecret === INTERNAL_SECRET) {
    // appel interne (pg_cron ou autre Edge Function)
  } else if (authHeader?.startsWith("Bearer ")) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);
  } else {
    return json({ error: "Missing authorization" }, 401);
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { campaign_id?: string; period?: string } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const isBatch = !body.campaign_id;
  const period  = body.period ?? getPrevMonthPeriod();

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return json({ error: "period must be YYYY-MM format" }, 422);
  }

  // ── Mode batch ────────────────────────────────────────────────────────────
  if (isBatch) {
    return await runBatch(admin, period);
  }

  // ── Mode single ───────────────────────────────────────────────────────────
  const result = await generateForCampaign(admin, body.campaign_id!, period);
  if (!result.ok && !result.already_exists) {
    return json({ error: result.error }, 500);
  }
  return json(result);
});

// ── Batch : génère les rapports pour toutes les campagnes actives ─────────────
async function runBatch(
  admin: ReturnType<typeof createClient>,
  period: string,
): Promise<Response> {
  const { data: campaigns, error: listErr } = await admin
    .from("campaign_requests")
    .select("id")
    .eq("status", "active");

  if (listErr) {
    return json({ error: "Failed to list active campaigns", detail: listErr.message }, 500);
  }

  const rows = campaigns ?? [];
  const results: Array<{ campaign_id: string } & ReportResult> = [];

  for (const c of rows) {
    try {
      const r = await generateForCampaign(admin, c.id as string, period);
      results.push({ campaign_id: c.id as string, ...r });
    } catch (err) {
      results.push({ campaign_id: c.id as string, ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed    = results.filter((r) => !r.ok).length;

  // Journal structuré lisible dans Supabase Logs
  console.log(JSON.stringify({
    event:     "batch_monthly_reports_complete",
    period,
    total:     results.length,
    succeeded,
    failed,
    failures:  results.filter((r) => !r.ok).map((r) => ({ campaign_id: r.campaign_id, error: r.error })),
  }));

  return json({ ok: true, period, processed: results.length, succeeded, failed, results });
}

// ── Génération du rapport pour une campagne ───────────────────────────────────
async function generateForCampaign(
  admin: ReturnType<typeof createClient>,
  campaign_id: string,
  period: string,
): Promise<ReportResult> {
  // ── Idempotence ─────────────────────────────────────────────────────────
  const { data: existing } = await admin
    .from("campaign_monthly_stats")
    .select("id, pdf_storage_url")
    .eq("campaign_id", campaign_id)
    .eq("report_period", period)
    .maybeSingle();

  if (existing?.pdf_storage_url) {
    return { ok: true, stats_id: existing.id as string, pdf_url: existing.pdf_storage_url as string, already_exists: true };
  }

  // ── Campagne ────────────────────────────────────────────────────────────
  const { data: campaign, error: campaignErr } = await admin
    .from("campaign_requests")
    .select("id, spot_name, spot_location, start_date, end_date, user_id, estimated_impressions_per_day")
    .eq("id", campaign_id)
    .maybeSingle();

  if (campaignErr || !campaign) return { ok: false, error: "Campaign not found" };

  const advertiser_id = campaign.user_id as string;

  // ── Plage du mois ───────────────────────────────────────────────────────
  const [year, month] = period.split("-").map(Number);
  const periodStart   = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const periodEnd     = new Date(year, month,     0).toISOString().split("T")[0];

  // ── Métriques ───────────────────────────────────────────────────────────
  const { data: metrics, error: metricsErr } = await admin
    .from("campaign_metrics")
    .select("distance_traveled_m, active_minutes, vehicle_id, metric_date")
    .eq("campaign_id", campaign_id)
    .gte("metric_date", periodStart)
    .lte("metric_date", periodEnd);

  if (metricsErr) return { ok: false, error: `Metrics error: ${metricsErr.message}` };

  const rows             = metrics ?? [];
  const totalDistanceM   = rows.reduce((s, r) => s + ((r.distance_traveled_m as number) ?? 0), 0);
  const totalKilometers  = parseFloat((totalDistanceM / 1000).toFixed(2));
  const totalMinutes     = rows.reduce((s, r) => s + ((r.active_minutes as number) ?? 0), 0);
  const activeDays       = new Set(rows.map((r) => r.metric_date).filter(Boolean)).size;
  const activeVehicles   = new Set(rows.map((r) => r.vehicle_id).filter(Boolean)).size;
  const impPerDay        = (campaign.estimated_impressions_per_day as number | null) ?? 0;
  const estimImpressions = activeDays * impPerDay;

  // ── Profil annonceur ────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from("advertiser_profiles").select("full_name, company")
    .eq("user_id", advertiser_id).maybeSingle();
  const { data: authUser } = await admin.auth.admin.getUserById(advertiser_id);
  const advertiserEmail = authUser?.user?.email ?? "";
  const advertiserName  = ((profile?.company ?? profile?.full_name ?? advertiserEmail) as string);

  // ── Helpers de formatage ────────────────────────────────────────────────
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const fmtNum  = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  const periodLabel = new Date(year, month - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const generatedAt = new Date()
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  // ── PDF A4 ──────────────────────────────────────────────────────────────
  const pdfDoc         = await PDFDocument.create();
  const page           = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const fontR          = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB          = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cPrimary = rgb(0.047, 0.325, 0.843);
  const cWhite   = rgb(1, 1, 1);
  const cText    = rgb(0.1, 0.1, 0.1);
  const cMuted   = rgb(0.5, 0.5, 0.5);
  const cSep     = rgb(0.87, 0.87, 0.87);
  const cCardBg  = rgb(0.95, 0.97, 1.0);
  const cGreen   = rgb(0.08, 0.57, 0.33);
  const cGreenBg = rgb(0.9, 1.0, 0.94);

  // Header
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: cPrimary });
  page.drawText("MoveSpot", { x: 40, y: height - 42, size: 22, font: fontB, color: cWhite });
  page.drawText("La publicité mobile, réinventée", { x: 40, y: height - 60, size: 9, font: fontR, color: rgb(0.78, 0.88, 1) });
  page.drawText("RAPPORT MENSUEL", { x: width - 170, y: height - 36, size: 14, font: fontB, color: cWhite });
  page.drawText(`Période : ${periodLabel}`, { x: width - 170, y: height - 54, size: 9, font: fontR, color: rgb(0.78, 0.88, 1) });

  let y = height - 100;
  const col1 = 40, col2 = 310;

  // Infos
  page.drawText("ANNONCEUR",  { x: col1, y, size: 8, font: fontB, color: cMuted });
  page.drawText("CAMPAGNE",   { x: col2, y, size: 8, font: fontB, color: cMuted });
  y -= 15;
  page.drawText(advertiserName, { x: col1, y, size: 10, font: fontB, color: cText });
  page.drawText((campaign.spot_name as string | null) ?? campaign.id.slice(0, 8).toUpperCase(), { x: col2, y, size: 10, font: fontB, color: cText });
  y -= 13;
  if (advertiserEmail)       page.drawText(advertiserEmail, { x: col1, y, size: 9, font: fontR, color: cMuted });
  if (campaign.spot_location) page.drawText(campaign.spot_location as string, { x: col2, y, size: 9, font: fontR, color: cMuted });
  y -= 13;
  page.drawText(`Période du rapport : ${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`, { x: col1, y, size: 9, font: fontR, color: cMuted });
  y -= 13;
  if (campaign.start_date || campaign.end_date) {
    page.drawText(`Durée campagne : ${fmtDate(campaign.start_date as string | null)} → ${fmtDate(campaign.end_date as string | null)}`, {
      x: col2, y: y + 13, size: 9, font: fontR, color: cMuted,
    });
  }
  y -= 20;
  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: cSep });
  y -= 22;

  // 3 KPI tiles
  page.drawText("STATISTIQUES DU MOIS", { x: col1, y, size: 11, font: fontB, color: cPrimary });
  y -= 18;
  const tileW = (width - 80 - 20) / 3;
  const tileH = 70;
  const tileY = y - tileH;
  const tiles = [
    { label: "Kilomètres parcourus", value: fmtNum(totalKilometers), unit: "km" },
    { label: "Véhicules actifs",      value: fmtNum(activeVehicles),  unit: "véhicules" },
    { label: "Impressions estimées",  value: fmtNum(estimImpressions), unit: "vues" },
  ];
  for (let i = 0; i < 3; i++) {
    const tx = col1 + i * (tileW + 10);
    page.drawRectangle({ x: tx, y: tileY, width: tileW, height: tileH, color: cCardBg, borderColor: cPrimary, borderWidth: 0.5 });
    const tile = tiles[i];
    const valW = fontB.widthOfTextAtSize(tile.value, 20);
    page.drawText(tile.value, { x: tx + tileW / 2 - valW / 2, y: tileY + 32, size: 20, font: fontB, color: cPrimary });
    const unitW = fontR.widthOfTextAtSize(tile.unit, 9);
    page.drawText(tile.unit, { x: tx + tileW / 2 - unitW / 2, y: tileY + 18, size: 9, font: fontR, color: cMuted });
    const lblW = fontR.widthOfTextAtSize(tile.label, 8);
    page.drawText(tile.label, { x: tx + tileW / 2 - lblW / 2, y: tileY + 6, size: 8, font: fontR, color: cText });
  }
  y = tileY - 24;

  // Tableau détaillé
  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: cSep });
  y -= 22;
  page.drawText("DÉTAILS DE PERFORMANCE", { x: col1, y, size: 11, font: fontB, color: cPrimary });
  y -= 18;

  const detailRows: Array<[string, string]> = [
    ["Jours actifs dans le mois",     `${activeDays} jour${activeDays > 1 ? "s" : ""}`],
    ["Distance totale parcourue",     `${fmtNum(totalKilometers)} km`],
    ["Minutes de conduite actives",   `${fmtNum(totalMinutes)} min`],
    ["Véhicules uniques actifs",      `${fmtNum(activeVehicles)}`],
    ["Impressions estimées par jour", `${fmtNum(impPerDay)} vues/j`],
    ["Impressions totales estimées",  `${fmtNum(estimImpressions)} vues`],
  ];
  for (const [label, value] of detailRows) {
    page.drawText(`${label} :`, { x: col1, y, size: 9, font: fontB, color: cText });
    const vw = fontR.widthOfTextAtSize(value, 9);
    page.drawText(value, { x: width - 40 - vw, y, size: 9, font: fontR, color: cText });
    page.drawLine({ start: { x: col1, y: y - 3 }, end: { x: width - 40, y: y - 3 }, thickness: 0.3, color: cSep });
    y -= 16;
  }
  y -= 16;

  if (activeDays > 0) {
    const badgeText = `✓ ${activeDays} jour${activeDays > 1 ? "s" : ""} de campagne active`;
    const bw = fontB.widthOfTextAtSize(badgeText, 9) + 20;
    page.drawRectangle({ x: col1, y: y - 6, width: bw, height: 20, color: cGreenBg, borderColor: cGreen, borderWidth: 0.8 });
    page.drawText(badgeText, { x: col1 + 10, y: y + 2, size: 9, font: fontB, color: cGreen });
    y -= 32;
  }

  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: cSep });
  y -= 16;

  const mentions = [
    "Les distances et impressions sont calculées automatiquement à partir des données GPS des véhicules.",
    "Les impressions sont des estimations basées sur les zones de diffusion et la durée d'activité.",
    `Rapport généré automatiquement le ${generatedAt}. Pour toute question : ${MOVESPOT.email}`,
  ];
  for (const m of mentions) {
    page.drawText(m, { x: col1, y, size: 7, font: fontR, color: cMuted });
    y -= 11;
  }

  page.drawLine({ start: { x: 0, y: 40 }, end: { x: width, y: 40 }, thickness: 0.5, color: cPrimary });
  const footerText = `MoveSpot SAS — La publicité mobile, réinventée — ${MOVESPOT.site}`;
  const ftw = fontR.widthOfTextAtSize(footerText, 7);
  page.drawText(footerText, { x: width / 2 - ftw / 2, y: 26, size: 7, font: fontR, color: cPrimary });

  const pdfBytes = await pdfDoc.save();

  // ── Upload Storage ──────────────────────────────────────────────────────
  const storagePath = `${advertiser_id}/${period}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("campaign-reports")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return { ok: false, error: `Storage upload failed: ${uploadErr.message}` };

  // ── Upsert campaign_monthly_stats ───────────────────────────────────────
  const statsPayload = {
    campaign_id,
    advertiser_id,
    report_period:         period,
    total_kilometers:      totalKilometers,
    active_vehicles_count: activeVehicles,
    estimated_impressions: estimImpressions,
    pdf_storage_url:       storagePath,
  };

  let statsId: string;

  if (existing) {
    const { data: updated, error: updateErr } = await admin
      .from("campaign_monthly_stats")
      .update(statsPayload)
      .eq("id", existing.id)
      .select("id").single();
    if (updateErr || !updated) {
      return { ok: false, error: `Stats update failed: ${updateErr?.message}` };
    }
    statsId = updated.id as string;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("campaign_monthly_stats")
      .insert(statsPayload)
      .select("id").single();
    if (insertErr || !inserted) {
      await admin.storage.from("campaign-reports").remove([storagePath]);
      return { ok: false, error: `Stats insert failed: ${insertErr?.message}` };
    }
    statsId = inserted.id as string;
  }

  // ── Email (non-bloquant) ────────────────────────────────────────────────
  if (advertiserEmail) {
    const emailPayload = {
      to:      advertiserEmail,
      subject: `Votre rapport mensuel MoveSpot — ${periodLabel}`,
      html: `<p>Bonjour ${advertiserName},</p>
<p>Votre rapport mensuel de performance pour <strong>${(campaign.spot_name as string | null) ?? "votre campagne"}</strong>
(période : <strong>${periodLabel}</strong>) est maintenant disponible.</p>
<ul>
  <li>🚗 <strong>${fmtNum(totalKilometers)} km</strong> parcourus</li>
  <li>🚌 <strong>${fmtNum(activeVehicles)} véhicule${activeVehicles > 1 ? "s" : ""}</strong> actif${activeVehicles > 1 ? "s" : ""}</li>
  <li>👁️ <strong>${fmtNum(estimImpressions)} impressions</strong> estimées</li>
</ul>
<p>Connectez-vous à votre espace MoveSpot pour télécharger le rapport complet en PDF.</p>
<p>Cordialement,<br>L'équipe MoveSpot</p>`,
    };
    const { error: emailErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: emailPayload,
    });
    if (emailErr) console.warn("Email enqueue failed (non-blocking):", emailErr);
  }

  return { ok: true, stats_id: statsId, pdf_url: storagePath };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
