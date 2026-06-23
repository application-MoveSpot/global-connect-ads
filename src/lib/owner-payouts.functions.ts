import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Compute due amounts: paid + finished + not yet paid out, grouped per owner ----
export const listDueOwnerPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const todayIso = new Date().toISOString().slice(0, 10);

    const { data: campaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, vehicle_id, total_price, owner_amount_cents, end_date, payment_status, payout_status, spot_name, paid_at")
      .eq("payment_status", "paid")
      .neq("payout_status", "transferred")
      .lte("end_date", todayIso);

    if (!campaigns || campaigns.length === 0) return { owners: [] };

    const vehicleIds = Array.from(new Set(campaigns.map((c) => c.vehicle_id).filter(Boolean) as string[]));
    const { data: vehicles } = await supabaseAdmin
      .from("vehicles")
      .select("id, name, owner_id")
      .in("id", vehicleIds);
    const ownerByVehicle = new Map((vehicles ?? []).map((v) => [v.id, { owner_id: v.owner_id, vehicle_name: v.name }]));

    const ownerIds = Array.from(new Set((vehicles ?? []).map((v) => v.owner_id)));
    const { data: owners } = await supabaseAdmin
      .from("owner_profiles")
      .select("id, user_id, full_name, iban, bic, account_holder")
      .in("id", ownerIds);
    const ownerMap = new Map((owners ?? []).map((o) => [o.id, o]));

    type Row = {
      owner_profile_id: string;
      owner_user_id: string;
      full_name: string;
      iban: string | null;
      bic: string | null;
      account_holder: string | null;
      total_cents: number;
      campaigns: { id: string; name: string; amount_cents: number; end_date: string | null }[];
    };
    const byOwner = new Map<string, Row>();

    for (const c of campaigns) {
      if (!c.vehicle_id) continue;
      const link = ownerByVehicle.get(c.vehicle_id);
      if (!link) continue;
      const owner = ownerMap.get(link.owner_id);
      if (!owner) continue;
      const amt = c.owner_amount_cents ?? Math.round((Number(c.total_price ?? 0) * 100) * 0.7);
      const existing = byOwner.get(owner.id) ?? {
        owner_profile_id: owner.id,
        owner_user_id: owner.user_id,
        full_name: owner.full_name ?? "",
        iban: owner.iban,
        bic: owner.bic,
        account_holder: owner.account_holder,
        total_cents: 0,
        campaigns: [],
      };
      existing.total_cents += amt;
      existing.campaigns.push({
        id: c.id,
        name: `${c.spot_name ?? ""} (${link.vehicle_name})`,
        amount_cents: amt,
        end_date: c.end_date,
      });
      byOwner.set(owner.id, existing);
    }

    return { owners: Array.from(byOwner.values()).sort((a, b) => b.total_cents - a.total_cents) };
  });

// ---- Generate a payout batch (creates owner_payouts rows + returns CSV + SEPA XML) ----
const GenerateInput = z.object({
  ownerIds: z.array(z.string().uuid()).min(1),
});

export const generatePayoutBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof GenerateInput>) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const due = await listDueOwnerPayouts();
    const selected = due.owners.filter((o) => data.ownerIds.includes(o.owner_profile_id));
    if (selected.length === 0) throw new Error("Aucun reversement à générer");

    const batchId = crypto.randomUUID();
    const rows: { id: string; owner_user_id: string; full_name: string; iban: string; bic: string; holder: string; amount_cents: number; campaign_ids: string[] }[] = [];

    for (const o of selected) {
      if (!o.iban) throw new Error(`IBAN manquant pour ${o.full_name}`);
      const { data: inserted, error } = await supabaseAdmin
        .from("owner_payouts")
        .insert({
          owner_id: o.owner_user_id,
          amount_cents: o.total_cents,
          status: "processing",
          campaign_request_ids: o.campaigns.map((c) => c.id),
          sepa_batch_id: batchId,
          iban_snapshot: o.iban,
          bic_snapshot: o.bic,
          holder_snapshot: o.account_holder ?? o.full_name,
        } as never)
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Insertion reversement échouée");
      rows.push({
        id: inserted.id,
        owner_user_id: o.owner_user_id,
        full_name: o.full_name,
        iban: o.iban,
        bic: o.bic ?? "",
        holder: o.account_holder ?? o.full_name,
        amount_cents: o.total_cents,
        campaign_ids: o.campaigns.map((c) => c.id),
      });
    }

    // CSV
    const csvLines = ["Bénéficiaire;IBAN;BIC;Montant EUR;Référence"];
    for (const r of rows) {
      csvLines.push(`${escapeCsv(r.holder)};${r.iban};${r.bic};${(r.amount_cents / 100).toFixed(2)};MoveSpot ${r.id.slice(0, 8)}`);
    }
    const csv = csvLines.join("\n");

    // SEPA XML pain.001.001.03
    const totalCents = rows.reduce((s, r) => s + r.amount_cents, 0);
    const ts = new Date().toISOString();
    const msgId = `MS${Date.now()}`;
    const debtorName = process.env.CA_ACCOUNT_HOLDER ?? "MoveSpot";
    const debtorIban = (process.env.CA_IBAN ?? "").replace(/\s/g, "");
    const debtorBic = process.env.CA_BIC ?? "";
    const sepaXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${ts}</CreDtTm>
      <NbOfTxs>${rows.length}</NbOfTxs>
      <CtrlSum>${(totalCents / 100).toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${escapeXml(debtorName)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${rows.length}</NbOfTxs>
      <CtrlSum>${(totalCents / 100).toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${ts.slice(0, 10)}</ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(debtorName)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${debtorIban}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${debtorBic}</BIC></FinInstnId></DbtrAgt>
${rows
  .map(
    (r, i) => `      <CdtTrfTxInf>
        <PmtId><EndToEndId>MS-${r.id.slice(0, 8)}-${i + 1}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${(r.amount_cents / 100).toFixed(2)}</InstdAmt></Amt>
        ${r.bic ? `<CdtrAgt><FinInstnId><BIC>${r.bic}</BIC></FinInstnId></CdtrAgt>` : ""}
        <Cdtr><Nm>${escapeXml(r.holder)}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${r.iban.replace(/\s/g, "")}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>MoveSpot reversement campagnes</Ustrd></RmtInf>
      </CdtTrfTxInf>`
  )
  .join("\n")}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    return { batchId, count: rows.length, totalCents, csv, sepaXml };
  });

// ---- Mark a batch as paid ----
const MarkPaidInput = z.object({ batchId: z.string().uuid() });

export const markBatchPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MarkPaidInput>) => MarkPaidInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payouts } = await supabaseAdmin
      .from("owner_payouts")
      .select("id, campaign_request_ids")
      .eq("sepa_batch_id", data.batchId)
      .eq("status", "processing");

    if (!payouts || payouts.length === 0) throw new Error("Aucun reversement à marquer payé");

    await supabaseAdmin
      .from("owner_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString(), marked_paid_by: userId } as never)
      .eq("sepa_batch_id", data.batchId);

    const allCampaignIds = payouts.flatMap((p) => (p.campaign_request_ids ?? []) as string[]);
    if (allCampaignIds.length > 0) {
      await supabaseAdmin
        .from("campaign_requests")
        .update({ payout_status: "transferred" } as never)
        .in("id", allCampaignIds);
    }

    return { count: payouts.length };
  });

// ---- List recent batches for admin history ----
export const listPayoutBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("owner_payouts")
      .select("id, sepa_batch_id, amount_cents, status, paid_at, created_at, holder_snapshot")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ---- Update my bank account (owner) ----
const BankInput = z.object({
  iban: z.string().min(15).max(34),
  bic: z.string().min(8).max(11),
  account_holder: z.string().min(2).max(120),
});

export const updateMyBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof BankInput>) => BankInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cleanIban = data.iban.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(cleanIban)) throw new Error("IBAN invalide");
    const cleanBic = data.bic.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic)) throw new Error("BIC invalide");

    const { error } = await supabase
      .from("owner_profiles")
      .update({ iban: cleanIban, bic: cleanBic, account_holder: data.account_holder.trim() } as never)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyBankAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("owner_profiles")
      .select("iban, bic, account_holder")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? { iban: null, bic: null, account_holder: null };
  });

function escapeCsv(s: string) {
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
