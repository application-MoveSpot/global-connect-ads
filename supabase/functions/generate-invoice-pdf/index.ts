/**
 * generate-invoice-pdf — Edge Function
 *
 * Génère un PDF de facture réglementaire et le stocke dans Supabase Storage.
 * Enregistre la ligne dans la table `invoices`.
 *
 * Appelée depuis approve-installation dès que pm_status passe à 'active'.
 *
 * Request body:
 *   campaign_id    string (UUID)
 *   advertiser_id  string (UUID)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY           = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET    = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// ── Informations légales MoveSpot ─────────────────────────────────────────────
const MOVESPOT = {
  name:    "MoveSpot SAS",
  siret:   "XXX XXX XXX XXXXX",          // À remplacer en production
  address: "12 Rue de la Mobilité, 75001 Paris",
  tva:     "FR XX XXX XXX XXX",           // À remplacer en production
  email:   "facturation@movespot.fr",
};
const TVA_RATE = 0.20;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth : appel interne (secret) ou admin JWT ────────────────────────────
  const internalSecret = req.headers.get("x-internal-secret");
  const authHeader     = req.headers.get("Authorization");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (internalSecret && internalSecret === INTERNAL_SECRET) {
    // Appel interne depuis approve-installation — autorisé
  } else if (authHeader?.startsWith("Bearer ")) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);
  } else {
    return json({ error: "Missing authorization" }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { campaign_id: string; advertiser_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { campaign_id, advertiser_id } = body;
  if (!campaign_id || !advertiser_id) {
    return json({ error: "campaign_id and advertiser_id are required" }, 422);
  }

  // ── Vérifier qu'une facture n'existe pas déjà pour cette campagne ─────────
  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("campaign_id", campaign_id)
    .maybeSingle();

  if (existing) {
    return json({ ok: true, invoice_id: existing.id, already_exists: true });
  }

  // ── Charger les données de la campagne ────────────────────────────────────
  const { data: campaign, error: campaignErr } = await admin
    .from("campaign_requests")
    .select("id, spot_name, spot_location, start_date, end_date, total_price, payment_status, created_at, route_zones")
    .eq("id", campaign_id)
    .maybeSingle();

  if (campaignErr || !campaign) {
    return json({ error: "Campaign not found" }, 404);
  }

  // ── Charger le profil de l'annonceur ─────────────────────────────────────
  const { data: profile } = await admin
    .from("advertiser_profiles")
    .select("full_name, company, siret, address, phone")
    .eq("user_id", advertiser_id)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(advertiser_id);
  const advertiserEmail = authUser?.user?.email ?? "";

  // ── Générer le numéro de facture ──────────────────────────────────────────
  const year = new Date().getFullYear();
  const { data: seqRow } = await admin.rpc("nextval", { seq_name: "invoices_seq" }).maybeSingle()
    .catch(() => ({ data: null }));
  const seqNum = (seqRow as number | null) ?? Math.floor(Math.random() * 9000) + 1000;
  const invoiceNumber = `INV-${year}-${String(seqNum).padStart(4, "0")}`;
  const invoiceDate   = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  // ── Calculs financiers ────────────────────────────────────────────────────
  const totalTTC  = campaign.total_price ?? 0;
  const totalHT   = parseFloat((totalTTC / (1 + TVA_RATE)).toFixed(2));
  const vatAmount = parseFloat((totalTTC - totalHT).toFixed(2));

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  // ── Génération du PDF avec pdf-lib ────────────────────────────────────────
  const pdfDoc  = await PDFDocument.create();
  const page    = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Couleurs MoveSpot
  const colorPrimary   = rgb(0.047, 0.325, 0.843); // #0C53D7 (bleu MoveSpot)
  const colorText      = rgb(0.1, 0.1, 0.1);
  const colorMuted     = rgb(0.5, 0.5, 0.5);
  const colorSuccess   = rgb(0.133, 0.545, 0.133);
  const colorBgHeader  = rgb(0.047, 0.325, 0.843);
  const colorWhite     = rgb(1, 1, 1);
  const colorLineSep   = rgb(0.85, 0.85, 0.85);

  // ── Header ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: colorBgHeader });
  page.drawText("MoveSpot", { x: 40, y: height - 42, size: 22, font: fontBold, color: colorWhite });
  page.drawText("La publicité mobile, réinventée", {
    x: 40, y: height - 60, size: 9, font: fontRegular, color: rgb(0.8, 0.9, 1),
  });

  // Titre FACTURE
  page.drawText("FACTURE", {
    x: width - 160, y: height - 38, size: 18, font: fontBold, color: colorWhite,
  });
  page.drawText(`N° ${invoiceNumber}`, {
    x: width - 160, y: height - 56, size: 9, font: fontRegular, color: rgb(0.8, 0.9, 1),
  });

  // ── Infos Émetteur + Destinataire ─────────────────────────────────────────
  const col1 = 40;
  const col2 = 310;
  let y = height - 110;

  // Label sections
  page.drawText("ÉMETTEUR", { x: col1, y, size: 8, font: fontBold, color: colorMuted });
  page.drawText("DESTINATAIRE", { x: col2, y, size: 8, font: fontBold, color: colorMuted });
  y -= 16;

  const drawRow = (label: string, x: number, yPos: number, bold = false) => {
    page.drawText(label, {
      x, y: yPos, size: 9,
      font: bold ? fontBold : fontRegular,
      color: colorText,
    });
  };

  drawRow(MOVESPOT.name, col1, y, true);
  drawRow(profile?.company ?? profile?.full_name ?? "Annonceur", col2, y, true);
  y -= 13;

  drawRow(`SIRET : ${MOVESPOT.siret}`, col1, y);
  if (profile?.siret) drawRow(`SIRET : ${profile.siret}`, col2, y);
  y -= 13;

  if (MOVESPOT.address) drawRow(MOVESPOT.address, col1, y);
  if (profile?.address) drawRow(profile.address, col2, y);
  y -= 13;

  drawRow(`TVA : ${MOVESPOT.tva}`, col1, y);
  if (advertiserEmail) drawRow(advertiserEmail, col2, y);
  y -= 13;

  drawRow(MOVESPOT.email, col1, y);
  y -= 25;

  // Date facture
  page.drawText(`Date de facturation : ${invoiceDate}`, {
    x: col1, y, size: 9, font: fontRegular, color: colorMuted,
  });
  y -= 30;

  // ── Séparateur ────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: colorLineSep });
  y -= 20;

  // ── Détails campagne ──────────────────────────────────────────────────────
  page.drawText("DÉTAILS DE LA PRESTATION", {
    x: col1, y, size: 10, font: fontBold, color: colorPrimary,
  });
  y -= 18;

  const detailRows: [string, string][] = [
    ["Campagne", campaign.spot_name ?? campaign.id],
    ["Référence", campaign.id.slice(0, 8).toUpperCase()],
    ["Zone de diffusion", campaign.spot_location ?? (campaign.route_zones as string[])?.join(", ") ?? "—"],
    ["Période", `${fmtDate(campaign.start_date)} → ${fmtDate(campaign.end_date)}`],
  ];

  for (const [label, value] of detailRows) {
    page.drawText(`${label} :`, { x: col1, y, size: 9, font: fontBold, color: colorText });
    page.drawText(value, { x: col1 + 140, y, size: 9, font: fontRegular, color: colorText });
    y -= 14;
  }

  y -= 20;

  // ── Tableau financier ─────────────────────────────────────────────────────
  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: colorLineSep });
  y -= 20;

  page.drawText("VENTILATION FINANCIÈRE", {
    x: col1, y, size: 10, font: fontBold, color: colorPrimary,
  });
  y -= 18;

  const finRows: [string, string][] = [
    ["Montant HT",  `${totalHT.toFixed(2).replace(".", ",")} €`],
    ["TVA 20 %",    `${vatAmount.toFixed(2).replace(".", ",")} €`],
  ];

  for (const [label, value] of finRows) {
    page.drawText(label, { x: col2, y, size: 9, font: fontRegular, color: colorText });
    page.drawText(value, { x: width - 40 - fontRegular.widthOfTextAtSize(value, 9), y, size: 9, font: fontRegular, color: colorText });
    y -= 14;
  }

  // Ligne TTC en gras
  page.drawLine({ start: { x: col2, y: y + 4 }, end: { x: width - 40, y: y + 4 }, thickness: 0.5, color: colorLineSep });
  y -= 10;
  const ttcStr = `${totalTTC.toFixed(2).replace(".", ",")} €`;
  page.drawText("TOTAL TTC", { x: col2, y, size: 11, font: fontBold, color: colorText });
  page.drawText(ttcStr, {
    x: width - 40 - fontBold.widthOfTextAtSize(ttcStr, 11), y, size: 11, font: fontBold, color: colorText,
  });
  y -= 24;

  // Badge "PAYÉE"
  const badgeW = 80;
  const badgeX = col2;
  page.drawRectangle({ x: badgeX, y: y - 6, width: badgeW, height: 20, color: rgb(0.9, 1, 0.9), borderColor: colorSuccess, borderWidth: 1 });
  page.drawText("✓ PAYÉE", {
    x: badgeX + 12, y: y + 2, size: 9, font: fontBold, color: colorSuccess,
  });
  y -= 36;

  // ── Mentions légales ──────────────────────────────────────────────────────
  page.drawLine({ start: { x: col1, y }, end: { x: width - 40, y }, thickness: 0.5, color: colorLineSep });
  y -= 16;

  const mentions = [
    "TVA non récupérable — Article 293B du CGI si applicable.",
    "Conformément à la loi n° 92-1442 du 31 décembre 1992, le paiement a été effectué avant",
    "la réalisation de la prestation. En cas de litige : facturation@movespot.fr",
    `Facture générée automatiquement le ${invoiceDate}.`,
  ];
  for (const m of mentions) {
    page.drawText(m, { x: col1, y, size: 7, font: fontRegular, color: colorMuted });
    y -= 11;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 0, y: 40 }, end: { x: width, y: 40 }, thickness: 0.5, color: colorBgHeader });
  page.drawText("MoveSpot SAS — La publicité mobile, réinventée — movespot.fr", {
    x: width / 2 - 130, y: 26, size: 7, font: fontRegular, color: colorPrimary,
  });

  // ── Sérialiser le PDF ─────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();

  // ── Upload vers Supabase Storage ──────────────────────────────────────────
  const storagePath = `${advertiser_id}/${invoiceNumber}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("invoices-archive")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return json({ error: "Failed to upload PDF" }, 500);
  }

  // ── Insérer la ligne dans invoices ────────────────────────────────────────
  const { data: invoice, error: insertErr } = await admin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      campaign_id,
      advertiser_id,
      amount_ht:  totalHT,
      amount_ttc: totalTTC,
      vat_amount: vatAmount,
      pdf_url:    storagePath,
      status:     "paid",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Invoice insert error:", insertErr);
    // Supprimer le fichier uploadé pour éviter les orphelins
    await admin.storage.from("invoices-archive").remove([storagePath]);
    return json({ error: "Failed to record invoice" }, 500);
  }

  return json({
    ok: true,
    invoice_id:     invoice.id,
    invoice_number: invoiceNumber,
    pdf_path:       storagePath,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
