import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Run against the requesting user's managed session; never mint another user's token.
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe("Restored refund and chat schema — real Data API", {
  skip: !sessionJson || !url || !key,
}, () => {
  const session = JSON.parse(sessionJson ?? "{}");
  const client = createClient(url ?? "http://localhost", key ?? "missing", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  const anon = createClient(url ?? "http://localhost", key ?? "missing", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("administrator can read refund requests with their optional AI analysis", async () => {
    const role = await client.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
    assert.equal(role.error, null);
    assert.equal(role.data, true, "This integration check requires the requesting administrator's session");
    const result = await client.from("refund_requests")
      .select("id,refund_claims_moderation(decision,risk_score_numeric)").limit(1);
    assert.equal(result.error, null);
    assert.ok(Array.isArray(result.data));
  });

  it("requesting user can read their own refund request", async () => {
    const result = await client.from("refund_requests").select("id,user_id")
      .eq("user_id", session.user.id);
    assert.equal(result.error, null);
    assert.ok(Array.isArray(result.data));
    for (const row of result.data ?? []) assert.equal(row.user_id, session.user.id);
  });

  it("an authenticated administrator still cannot create a request under another user's identity", async () => {
    const result = await client.from("refund_requests").insert({
      user_id: "00000000-0000-0000-0000-000000000002",
      reason: "QA forbidden request identity — must never be inserted",
    });
    assert.equal(result.error?.code, "42501");
  });

  it("anonymous callers cannot read refund or chat AI data", async () => {
    for (const table of ["refund_requests", "refund_claims_moderation", "moderation_alerts", "ai_translations", "ai_conversation_summaries"]) {
      const result = await anon.from(table).select("*").limit(1);
      assert.equal(result.error?.code, "42501", table);
      assert.equal(result.data, null);
    }
  });

  it("even an authenticated administrator cannot write AI cache rows", async () => {
    const translation = await client.from("ai_translations").insert({
      cache_key: "qa-forbidden-cache-write", target_lang: "en", translation: "QA",
    });
    assert.equal(translation.error?.code, "42501");
    const summary = await client.from("ai_conversation_summaries").insert({
      conversation_id: "00000000-0000-0000-0000-000000000001", user_id: session.user.id,
      summary: "QA", expires_at: "2099-01-01T00:00:00Z",
    });
    assert.equal(summary.error?.code, "42501");
  });
});