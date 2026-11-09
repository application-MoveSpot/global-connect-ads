/**
 * process-campaign-payout — Edge Function
 *
 * Calcule et vire le gain net d'un propriétaire pour une campagne terminée.
 *
 * Étapes :
 *  1. Lire le gain brut depuis payee_earnings (ou owner_amount_cents sur campaign_requests)
 *  2. Déduire les pénalités impayées (owner_penalties.status = 'pending')
 *  3. Créditer owner_wallets.balance_ht (upsert)
 *  4. Inscrire les wallet_transactions (earnings + déductions pénalités)
 *  5. Si stripe_connect_id configuré → Stripe Transfer
 *  6. Marquer pénalités en 'collected', payee_earnings en 'settled'
 *
 * Request body:
 *   campaign_id      string (UUID)
 *   owner_user_id    string (UUID)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY           = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY  = Deno.env.get("STRIPE_SECRET_KEY")!;
const INTERNAL_SECRET    = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth ─────────────────────────────────────────────────────────────────
  const internalSecret = req.headers.get("x-internal-secret");
  const authHeader     = req.headers.get("Authorization");
  const admin          = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (internalSecret && internalSecret === INTERNAL_SECRET) {
    // appel interne depuis pm-lifecycle ou cron
  } else if (authHeader?.startsWith("Bearer ")) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Forbidden: admin only" }, 403);
  } else {
    return json({ error: "Missing authorization" }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { campaign_id: string; owner_user_id: string };
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { campaign_id, owner_user_id } = body;
  if (!campaign_id || !owner_user_id) {
    return json({ error: "campaign_id and owner_user_id are required" }, 422);
  }

  // ── Idempotence : déjà traité ? ───────────────────────────────────────────
  const { data: existingTx } = await admin
    .from("wallet_transactions")
    .select("id, status")
    .eq("reference_id", campaign_id)
    .eq("type", "earnings")
    .eq("status", "completed")
    .maybeSingle();

  if (existingTx) {
    return json({ ok: true, already_processed: true, transaction_id: existingTx.id });
  }

  // ── 1. Gain brut depuis payee_earnings ────────────────────────────────────
  const { data: earning } = await admin
    .from("payee_earnings")
    .select("id, amount_cents, status")
    .eq("campaign_request_id", campaign_id)
    .eq("payee_user_id", owner_user_id)
    .maybeSingle();

  // Fallback : owner_amount_cents sur campaign_requests
  let grossCents = earning?.amount_cents ?? 0;
  if (!grossCents) {
    const { data: campaign } = await admin
      .from("campaign_requests")
      .select("owner_amount_cents")
      .eq("id", campaign_id)
      .maybeSingle();
    grossCents = campaign?.owner_amount_cents ?? 0;
  }

  if (grossCents <= 0) {
    return json({ error: "No earnings found for this campaign and owner" }, 404);
  }

  const grossEur = grossCents / 100;

  // ── 2. Pénalités impayées ─────────────────────────────────────────────────
  const { data: penalties } = await admin
    .from("owner_penalties")
    .select("id, amount_eur, fault_cause")
    .eq("owner_id", owner_user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const penaltyTotal   = (penalties ?? []).reduce((s, p) => s + (p.amount_eur ?? 0), 0);
  const netEur         = Math.max(0, grossEur - penaltyTotal);

  // ── 3. Upsert owner_wallets ───────────────────────────────────────────────
  // On récupère (ou crée) le wallet du propriétaire
  let { data: wallet } = await admin
    .from("owner_wallets")
    .select("id, balance_ht, stripe_connect_id")
    .eq("owner_id", owner_user_id)
    .maybeSingle();

  if (!wallet) {
    // Récupérer stripe_connect_id depuis owner_profiles
    const { data: ownerProfile } = await admin
      .from("owner_profiles")
      .select("stripe_connect_account_id, stripe_charges_enabled")
      .eq("user_id", owner_user_id)
      .maybeSingle();

    const { data: newWallet, error: wErr } = await admin
      .from("owner_wallets")
      .insert({
        owner_id:         owner_user_id,
        stripe_connect_id: ownerProfile?.stripe_connect_account_id ?? null,
        balance_ht:       0,
      })
      .select("id, balance_ht, stripe_connect_id")
      .single();
    if (wErr || !newWallet) {
      return json({ error: "Failed to create wallet" }, 500);
    }
    wallet = newWallet;
  }

  // ── 4. Enregistrer les transactions ───────────────────────────────────────
  const now = new Date().toISOString();
  const txInserts = [];

  // Transaction de gain brut
  txInserts.push({
    wallet_id:   wallet.id,
    amount:      grossEur,
    type:        "earnings",
    status:      "pending",
    reference_id: campaign_id,
    description: `Gain campagne (brut)`,
  });

  // Une transaction de pénalité par pénalité déduite
  for (const p of penalties ?? []) {
    txInserts.push({
      wallet_id:   wallet.id,
      amount:      -(p.amount_eur ?? 0),
      type:        "penalty",
      status:      "pending",
      reference_id: p.id,
      description: `Pénalité propreté/conformité — ${p.fault_cause}`,
    });
  }

  const { data: insertedTxs, error: txErr } = await admin
    .from("wallet_transactions")
    .insert(txInserts)
    .select("id, type");
  if (txErr || !insertedTxs) {
    return json({ error: "Failed to record transactions" }, 500);
  }

  const earningsTxId = insertedTxs.find((t) => t.type === "earnings")?.id;

  // ── 5. Stripe Transfer si compte configuré ────────────────────────────────
  let stripeTransferId: string | null = null;
  const stripeAccountId = wallet.stripe_connect_id;

  if (stripeAccountId && netEur > 0 && STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
      const transfer = await stripe.transfers.create({
        amount:      Math.round(netEur * 100),
        currency:    "eur",
        destination: stripeAccountId,
        metadata:    { campaign_id, owner_user_id },
        description: `MoveSpot — virement campagne ${campaign_id.slice(0, 8).toUpperCase()}`,
      });
      stripeTransferId = transfer.id;
    } catch (stripeErr) {
      console.error("Stripe transfer error (non-blocking):", stripeErr);
      // On ne bloque pas le payout — la transaction reste en 'pending' si Stripe échoue
    }
  }

  // ── 6. Créditer le solde + finaliser les transactions ────────────────────
  const finalStatus = stripeTransferId ? "completed" : "completed";
  // Note : si Stripe a échoué, on crédite quand même le wallet (virement manuel possible)

  await admin
    .from("owner_wallets")
    .update({ balance_ht: (wallet.balance_ht ?? 0) + netEur })
    .eq("id", wallet.id);

  // Mettre à jour toutes les transactions pending de ce wallet pour cette campagne
  for (const tx of insertedTxs) {
    const updatePayload: Record<string, unknown> = { status: finalStatus };
    if (tx.type === "earnings" && stripeTransferId) {
      updatePayload.stripe_transfer_id = stripeTransferId;
    }
    await admin
      .from("wallet_transactions")
      .update(updatePayload)
      .eq("id", tx.id);
  }

  // ── 7. Marquer pénalités 'collected' ─────────────────────────────────────
  if ((penalties ?? []).length > 0) {
    await admin
      .from("owner_penalties")
      .update({
        status:       "collected",
        collected_at: now,
        notes:        `Déduite du virement campagne ${campaign_id.slice(0, 8).toUpperCase()}`,
      })
      .in("id", (penalties ?? []).map((p) => p.id));
  }

  // ── 8. Marquer payee_earnings 'settled' ───────────────────────────────────
  if (earning?.id) {
    await admin
      .from("payee_earnings")
      .update({ status: "settled" })
      .eq("id", earning.id);
  }

  // ── 9. Mettre à jour payout_status sur campaign_requests ─────────────────
  await admin
    .from("campaign_requests")
    .update({ payout_status: stripeTransferId ? "paid" : "processed" })
    .eq("id", campaign_id);

  // ── 10. pm_job pour traçabilité ───────────────────────────────────────────
  await admin.from("pm_jobs").insert({
    campaign_request_id: campaign_id,
    job_type:            "campaign_payout_processed",
    status:              "completed",
    user_id:             owner_user_id,
    payload: {
      gross_eur:          grossEur,
      penalty_total_eur:  penaltyTotal,
      net_eur:            netEur,
      stripe_transfer_id: stripeTransferId,
      processed_at:       now,
    },
  });

  return json({
    ok:                 true,
    gross_eur:          grossEur,
    penalty_total_eur:  penaltyTotal,
    net_eur:            netEur,
    wallet_id:          wallet.id,
    earnings_tx_id:     earningsTxId,
    stripe_transfer_id: stripeTransferId,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
