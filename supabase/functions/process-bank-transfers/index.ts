import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY  = (Deno.env.get("MOVESPOT_STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY"))!;
const INTERNAL_SECRET    = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BankTransferRequest {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  reference: string;
  status: string;
  stripe_account_id: string | null;
  admin_notes: string | null;
  stripe_transfer_id: string | null;
  failure_reason: string | null;
}

interface ProcessResult {
  success: boolean;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  details: Array<{ id: string; status: "completed" | "failed" | "skipped"; stripe_transfer_id?: string; reason?: string }>;
}

// ─── Stripe transfer helper ─────────────────────────────────────────────────

async function createStripeTransfer(params: {
  amountCents: number;
  currency: string;
  destination: string;
  idempotencyKey: string;
  metadata: Record<string, string>;
}): Promise<{ transferId: string } | { error: string }> {
  const formData = new URLSearchParams({
    amount:      String(params.amountCents),
    currency:    params.currency,
    destination: params.destination,
  });
  for (const [k, v] of Object.entries(params.metadata)) {
    formData.set(`metadata[${k}]`, v);
  }

  const res = await fetch("https://api.stripe.com/v1/transfers", {
    method: "POST",
    headers: {
      Authorization:    `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type":   "application/x-www-form-urlencoded",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: formData.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error?.message ?? `stripe_http_${res.status}` };
  }
  return { transferId: data.id as string };
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-internal-secret, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const incomingSecret =
    req.headers.get("x-internal-secret") ??
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const validTokens = [SERVICE_ROLE_KEY, INTERNAL_SECRET].filter(Boolean);
  if (!validTokens.includes(incomingSecret)) {
    console.error("[process-bank-transfers] Unauthorized call");
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const result: ProcessResult = { success: true, processed: 0, completed: 0, failed: 0, skipped: 0, details: [] };
  const startedAt = new Date().toISOString();

  try {
    // ── 1. Fetch all pending rows ───────────────────────────────────────────
    const { data: rows, error: fetchErr } = await supabase
      .from("bank_transfer_requests")
      .select("id, user_id, amount_cents, currency, reference, status, stripe_account_id, admin_notes, stripe_transfer_id, failure_reason")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw new Error(`fetch_error: ${fetchErr.message}`);
    if (!rows || rows.length === 0) {
      console.log("[process-bank-transfers] No pending transfers.");
      await logCron(supabase, startedAt, { ...result, message: "no_pending_rows" });
      return json({ ...result, message: "no_pending_rows" });
    }

    console.log(`[process-bank-transfers] Processing ${rows.length} pending rows.`);

    for (const row of rows as BankTransferRequest[]) {
      result.processed++;

      // ── 2. Resolve Stripe Connect account ID ──────────────────────────────
      let stripeAccountId = row.stripe_account_id;

      if (!stripeAccountId) {
        const { data: op } = await supabase
          .from("owner_profiles")
          .select("stripe_account_id, stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled")
          .eq("user_id", row.user_id)
          .maybeSingle();

        if (op?.stripe_payouts_enabled && op.stripe_account_id) {
          stripeAccountId = op.stripe_account_id;
        } else if (op?.stripe_connect_account_id) {
          stripeAccountId = op.stripe_connect_account_id;
        }
      }

      if (!stripeAccountId) {
        result.skipped++;
        result.details.push({ id: row.id, status: "skipped", reason: "no_stripe_account" });
        console.warn(`[process-bank-transfers] Skipping row ${row.id}: no Stripe account for user ${row.user_id}`);
        continue;
      }

      // ── 3. Lock the row: pending → processing ─────────────────────────────
      const { error: lockErr } = await supabase
        .from("bank_transfer_requests")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "pending"); // guard against race condition

      if (lockErr) {
        console.warn(`[process-bank-transfers] Could not lock row ${row.id}: ${lockErr.message}`);
        result.skipped++;
        result.details.push({ id: row.id, status: "skipped", reason: "lock_failed" });
        continue;
      }

      // ── 4. Call Stripe Transfers API with idempotency key ─────────────────
      const idempotencyKey = `transfer_req_${row.id}`;
      const stripeResult = await createStripeTransfer({
        amountCents:    row.amount_cents,
        currency:       row.currency ?? "eur",
        destination:    stripeAccountId,
        idempotencyKey,
        metadata: {
          bank_transfer_request_id: row.id,
          user_id:                  row.user_id,
          reference:                row.reference,
        },
      });

      // ── 5. Update row with result ──────────────────────────────────────────
      if ("transferId" in stripeResult) {
        await supabase
          .from("bank_transfer_requests")
          .update({
            status:             "completed",
            stripe_transfer_id: stripeResult.transferId,
            stripe_account_id:  stripeAccountId,
            reviewed_at:        new Date().toISOString(),
            updated_at:         new Date().toISOString(),
          })
          .eq("id", row.id);

        result.completed++;
        result.details.push({ id: row.id, status: "completed", stripe_transfer_id: stripeResult.transferId });
        console.log(`[process-bank-transfers] ✓ row ${row.id} → transfer ${stripeResult.transferId}`);

        // Notify owner
        await supabase.from("notifications").insert({
          user_id: row.user_id,
          type:    "bank_transfer_completed",
          payload: {
            bank_transfer_request_id: row.id,
            amount_cents:             row.amount_cents,
            stripe_transfer_id:       stripeResult.transferId,
          },
        }).throwOnError().catch(() => null);

      } else {
        await supabase
          .from("bank_transfer_requests")
          .update({
            status:         "failed",
            failure_reason: stripeResult.error,
            updated_at:     new Date().toISOString(),
          })
          .eq("id", row.id);

        result.failed++;
        result.details.push({ id: row.id, status: "failed", reason: stripeResult.error });
        console.error(`[process-bank-transfers] ✗ row ${row.id}: ${stripeResult.error}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[process-bank-transfers] Fatal error: ${msg}`);
    result.success = false;
    await logCron(supabase, startedAt, { ...result, fatal_error: msg });
    return json({ ...result, fatal_error: msg }, 500);
  }

  await logCron(supabase, startedAt, result);
  return json(result);
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function logCron(
  supabase: ReturnType<typeof createClient>,
  startedAt: string,
  result: unknown,
) {
  await supabase
    .from("admin_cron_logs")
    .insert({
      job_name:    "process-bank-transfers",
      result:      result,
      executed_at: startedAt,
    })
    .throwOnError()
    .catch((e: Error) => console.warn("[process-bank-transfers] Failed to write cron log:", e.message));
}
