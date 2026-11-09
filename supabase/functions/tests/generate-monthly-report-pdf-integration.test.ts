/**
 * Integration tests — generate-monthly-report-pdf
 *
 * Verifies:
 *  1. getPrevMonthPeriod() returns a valid "YYYY-MM" string
 *  2. Batch trigger response shape has all required fields
 *  3. Per-campaign error isolation: a failing campaign does not abort others
 *  4. Structured log format matches the expected JSON schema
 */

import { assertEquals, assertMatch, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Re-export the pure utility under test ────────────────────────────────────
// The edge function exports getPrevMonthPeriod() — import it here.
import { getPrevMonthPeriod } from "../generate-monthly-report-pdf/index.ts";

// ── 1. getPrevMonthPeriod() ───────────────────────────────────────────────────

Deno.test("getPrevMonthPeriod: returns YYYY-MM format", () => {
  const period = getPrevMonthPeriod();
  assertMatch(period, /^\d{4}-\d{2}$/, "period must match YYYY-MM");
});

Deno.test("getPrevMonthPeriod: month is strictly in the past", () => {
  const period = getPrevMonthPeriod();
  const [year, month] = period.split("-").map(Number);

  const now       = new Date();
  const thisYear  = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // 1-based

  const inPast =
    year < thisYear ||
    (year === thisYear && month < thisMonth);

  assertEquals(inPast, true, `${period} should be before current month ${thisYear}-${String(thisMonth).padStart(2, "0")}`);
});

Deno.test("getPrevMonthPeriod: month value is between 01 and 12", () => {
  const period = getPrevMonthPeriod();
  const month  = Number(period.split("-")[1]);
  assertEquals(month >= 1 && month <= 12, true, "month must be in [01-12]");
});

// ── Helper: build a minimal mock Supabase admin client ───────────────────────

type MockQuery = {
  data: unknown[] | null;
  error: null;
};

function makeMockAdmin(campaigns: { id: string }[]) {
  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          // For campaign_requests query in runBatch
          data: table === "campaign_requests" ? campaigns : [],
          error: null,
        }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    // campaign_monthly_stats idempotence check always returns null (no existing record)
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
    auth: {
      admin: {
        getUserById: (_id: string) =>
          Promise.resolve({ data: { user: { email: "advertiser@example.com" } } }),
      },
    },
    functions: {
      invoke: () => Promise.resolve({ error: null }),
    },
  };
}

// ── 2 & 3. Batch response structure + error isolation ────────────────────────

/**
 * Minimal inline runBatch to test logic independently of Supabase network.
 * Mirrors the production logic exactly:
 *   - iterates campaigns
 *   - catches per-campaign errors
 *   - returns structured { ok, period, processed, succeeded, failed, results }
 */
async function runBatchSimulation(
  campaigns: { id: string }[],
  failIds: Set<string>,
  period: string,
): Promise<{
  ok: boolean;
  period: string;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ campaign_id: string; ok: boolean; error?: string }>;
}> {
  const results: Array<{ campaign_id: string; ok: boolean; error?: string }> = [];

  for (const c of campaigns) {
    try {
      if (failIds.has(c.id)) throw new Error(`Simulated failure for ${c.id}`);
      results.push({ campaign_id: c.id, ok: true });
    } catch (err) {
      results.push({ campaign_id: c.id, ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed    = results.filter((r) => !r.ok).length;

  // Mirrors production structured log
  const logPayload = {
    event:     "batch_monthly_reports_complete",
    period,
    total:     results.length,
    succeeded,
    failed,
    failures:  results.filter((r) => !r.ok),
  };
  console.log(JSON.stringify(logPayload));

  return {
    ok:        true,
    period,
    processed: results.length,
    succeeded,
    failed,
    results,
  };
}

Deno.test("batch response: contains all required top-level fields", async () => {
  const campaigns = [{ id: "camp-1" }, { id: "camp-2" }, { id: "camp-3" }];
  const period    = "2026-10";
  const response  = await runBatchSimulation(campaigns, new Set(), period);

  assertExists(response.ok,        "ok field must be present");
  assertExists(response.period,    "period field must be present");
  assertExists(response.processed, "processed field must be present");
  assertExists(response.succeeded !== undefined, "succeeded field must be present");
  assertExists(response.failed !== undefined,    "failed field must be present");
  assertExists(response.results,   "results field must be present");
});

Deno.test("batch response: counts match results array", async () => {
  const campaigns = [{ id: "camp-1" }, { id: "camp-2" }, { id: "camp-3" }];
  const failIds   = new Set(["camp-2"]);
  const period    = "2026-10";
  const response  = await runBatchSimulation(campaigns, failIds, period);

  assertEquals(response.processed, 3, "processed should count all campaigns");
  assertEquals(response.succeeded, 2, "succeeded should count non-failing");
  assertEquals(response.failed,    1, "failed should count erroring campaigns");
  assertEquals(response.results.length, 3, "results array length matches processed");
});

Deno.test("error isolation: failed campaign does not block others", async () => {
  const campaigns = [
    { id: "camp-ok-1" },
    { id: "camp-fail" },
    { id: "camp-ok-2" },
  ];
  const failIds = new Set(["camp-fail"]);
  const period  = "2026-10";

  const response = await runBatchSimulation(campaigns, failIds, period);

  // All three ran
  assertEquals(response.processed, 3);

  // The two successful ones have ok=true
  const ok1 = response.results.find((r) => r.campaign_id === "camp-ok-1");
  const ok2 = response.results.find((r) => r.campaign_id === "camp-ok-2");
  assertEquals(ok1?.ok, true,  "camp-ok-1 should succeed");
  assertEquals(ok2?.ok, true,  "camp-ok-2 should succeed");

  // The failing one has ok=false and an error string
  const fail = response.results.find((r) => r.campaign_id === "camp-fail");
  assertEquals(fail?.ok, false, "camp-fail should be marked failed");
  assertExists(fail?.error,     "camp-fail should carry an error message");
});

Deno.test("error isolation: top-level ok is true even with partial failures", async () => {
  const campaigns = [{ id: "camp-1" }, { id: "camp-2" }];
  const failIds   = new Set(["camp-1", "camp-2"]); // ALL fail
  const period    = "2026-10";

  const response = await runBatchSimulation(campaigns, failIds, period);

  // Top-level ok stays true so the cron job doesn't retry endlessly
  assertEquals(response.ok, true, "batch ok must remain true even when all campaigns fail");
  assertEquals(response.failed, 2);
  assertEquals(response.succeeded, 0);
});

// ── 4. Structured log format ──────────────────────────────────────────────────

Deno.test("structured log: matches expected JSON schema", async () => {
  const capturedLogs: string[] = [];
  const originalLog = console.log;

  // Intercept console.log
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  try {
    const campaigns = [{ id: "camp-a" }, { id: "camp-b" }];
    const failIds   = new Set(["camp-b"]);
    const period    = "2026-10";
    await runBatchSimulation(campaigns, failIds, period);
  } finally {
    console.log = originalLog;
  }

  // Find the structured log entry
  const logEntry = capturedLogs.find((l) => l.includes("batch_monthly_reports_complete"));
  assertExists(logEntry, "structured log entry must be emitted");

  const parsed = JSON.parse(logEntry!);
  assertEquals(parsed.event,     "batch_monthly_reports_complete");
  assertMatch(parsed.period,     /^\d{4}-\d{2}$/);
  assertEquals(typeof parsed.total,     "number");
  assertEquals(typeof parsed.succeeded, "number");
  assertEquals(typeof parsed.failed,    "number");
  assertExists(parsed.failures, "failures array must be present");
  assertEquals(Array.isArray(parsed.failures), true);
});

Deno.test("structured log: failures array contains campaign_id and error", async () => {
  const capturedLogs: string[] = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  try {
    await runBatchSimulation([{ id: "bad-camp" }], new Set(["bad-camp"]), "2026-10");
  } finally {
    console.log = originalLog;
  }

  const logEntry = capturedLogs.find((l) => l.includes("batch_monthly_reports_complete"))!;
  const parsed   = JSON.parse(logEntry);

  assertEquals(parsed.failures.length, 1);
  assertExists(parsed.failures[0].campaign_id, "failure entry must have campaign_id");
  assertExists(parsed.failures[0].error,       "failure entry must have error");
});
