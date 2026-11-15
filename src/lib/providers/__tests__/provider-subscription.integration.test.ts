import { it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

it("public providers are exactly approved profiles with active or trialing subscriptions", {
  skip: !url || !key || !sessionJson,
}, async () => {
  const session = JSON.parse(sessionJson ?? "{}");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const anon = createClient(url ?? "http://localhost", key ?? "missing", options);
  const admin = createClient(url ?? "http://localhost", key ?? "missing", {
    ...options,
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  const role = await admin.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
  assert.equal(role.error, null);
  assert.equal(role.data, true, "Requires the requesting administrator's session");
  const all = await admin.from("provider_profiles").select("user_id,status,stripe_subscription_status");
  const visible = await anon.from("public_provider_profiles").select("user_id");
  assert.equal(all.error, null);
  assert.equal(visible.error, null);
  const expected = (all.data ?? []).filter((p) => p.status === "approved" &&
    ["active", "trialing"].includes(p.stripe_subscription_status ?? ""))
    .map((p) => p.user_id).sort();
  assert.deepEqual((visible.data ?? []).map((p) => p.user_id).sort(), expected);
});