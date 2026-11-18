import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../incident.functions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(role: boolean | null = true, emailFails = false) {
  const queries: string[] = [];
  const roles: unknown[] = [];
  const emails: Array<Record<string, unknown>> = [];
  const userId = "reporter-user";
  const vehicleId = "vehicle-id";
  const rows: Record<string, unknown> = {
    owner_profiles: { id: "owner-profile" },
    vehicles: { id: vehicleId, name: "Test véhicule", owner_id: "owner-profile", driver_id: null },
    incident_reports: { id: "incident-id" },
    user_roles: [],
  };
  const admin = {
    from(table: string) {
      queries.push(table);
      const result = { data: rows[table], error: null };
      const chain: Record<string, unknown> = {};
      for (const key of ["select", "eq", "insert", "update", "limit"]) {
        chain[key] = () => chain;
      }
      chain.order = () => { result.data = []; return chain; };
      chain.single = chain.maybeSingle = async () => result;
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return chain;
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "reporter@example.test" } } }), listUsers: async () => ({ data: { users: [] } }) } },
  };
  const exports: Record<string, (input: unknown) => Promise<unknown>> = {};
  const mockRequire = (name: string) => {
    if (name === "@tanstack/react-start") return {
      createServerFn: () => {
        const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
        return builder;
      },
    };
    if (name.endsWith("auth-middleware")) return { requireSupabaseAuth: {} };
    if (name.endsWith("rateLimit.server")) return { assertRateLimit: () => {} };
    if (name.endsWith("client.server")) return { supabaseAdmin: admin };
    if (name.endsWith("push-send.server")) return { sendWebPushToUser: async () => {} };
    if (name.endsWith("send.server")) return { sendAppEmail: async (params: Record<string, unknown>) => {
      emails.push(params);
      if (emailFails) throw new Error("Email unavailable");
      return { sent: true };
    } };
    return require(name);
  };
  new Function("require", "exports", compiled)(mockRequire, exports);
  const context = { userId, supabase: { rpc: async (name: string, args: unknown) => {
    roles.push({ name, args });
    return { data: role };
  } } };
  return { exports, context, queries, roles, emails, vehicleId };
}

describe("incident administrator permissions", () => {
  for (const fn of ["adminListIncidentReports", "adminUpdateIncidentReport"]) {
    it(`${fn} refuses non-admins before privileged access`, async () => {
      const s = setup(false);
      await assert.rejects(s.exports[fn]({ context: s.context, data: { id: "incident-id", status: "closed" } }), /Accès refusé/);
      assert.deepEqual(s.queries, []);
      assert.deepEqual(s.roles, [{ name: "has_role", args: { _user_id: "reporter-user", _role: "admin" } }]);
    });
    it(`${fn} permits admins using has_role`, async () => {
      const s = setup();
      if (fn === "adminListIncidentReports") {
        assert.deepEqual(await s.exports[fn]({ context: s.context, data: {} }), { reports: [] });
      } else {
        assert.deepEqual(await s.exports[fn]({ context: s.context, data: { id: "incident-id", status: "closed" } }), { ok: true });
      }
      assert.deepEqual(s.roles, [{ name: "has_role", args: { _user_id: "reporter-user", _role: "admin" } }]);
      assert.deepEqual(s.queries, ["incident_reports"]);
    });
  }
});

describe("incident email notifications", () => {
  for (const emailFails of [false, true]) {
    it(emailFails ? "preserves the saved report when email fails" : "sends one event-keyed admin alert", async () => {
      const s = setup(true, emailFails);
      const result = await s.exports.submitIncidentReport({ context: s.context, data: {
        vehicleId: s.vehicleId, incidentType: "autre", description: "Signalement technique",
      } });
      assert.deepEqual(result, { ok: true, id: "incident-id" });
      assert.equal(s.emails.length, 1);
      assert.equal(s.emails[0].templateName, "admin-incident-alert");
      assert.equal(s.emails[0].idempotencyKey, "incident-alert-incident-id");
      assert.equal((s.emails[0].templateData as Record<string, unknown>).reporterEmail, "reporter@example.test");
    });
  }
});