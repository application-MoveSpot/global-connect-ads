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

function setup(role: boolean | null = true, emailFails = false, extraRows: Record<string, unknown> = {}) {
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
    ...extraRows,
  };
  const admin = {
    from(table: string) {
      queries.push(table);
      const result = { data: rows[table], error: null };
      const chain: Record<string, unknown> = {};
      for (const key of ["select", "eq", "insert", "update", "limit"]) {
        chain[key] = () => chain;
      }
      chain.order = () => { if (!Array.isArray(result.data)) result.data = []; return chain; };
      chain.in = (col: string, values: unknown[]) => {
        if (Array.isArray(result.data)) {
          result.data = result.data.filter((row) =>
            (values as unknown[]).includes((row as Record<string, unknown>)[col]),
          );
        }
        return chain;
      };
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

describe("incident installer attribution", () => {
  const quoted = "vehicle-with-quote";
  const unquoted = "vehicle-without-quote";

  const report = (vehicleId: string) => ({
    id: `incident-${vehicleId}`,
    created_at: "2026-11-18T10:00:00.000Z",
    user_id: "reporter-user",
    vehicle_id: vehicleId,
    campaign_request_id: null,
    incident_type: "decollement_vinyle",
    description: null,
    photo_path: null,
    status: "open",
    admin_note: null,
    vehicles: { name: `Voiture ${vehicleId}` },
  });

  it("shows the installer resolved from service_quotes and provider_profiles", async () => {
    const s = setup(true, false, {
      incident_reports: [report(quoted), report(unquoted)],
      service_quotes: [{ vehicle_id: quoted, provider_id: "provider-user" }],
      provider_profiles: [{ user_id: "provider-user", full_name: "Atelier Covering Pro" }],
    });
    const result = (await s.exports.adminListIncidentReports({ context: s.context, data: {} })) as {
      reports: Array<Record<string, unknown>>;
    };

    const withInstaller = result.reports.find((r) => r.vehicle_id === quoted);
    assert.equal(withInstaller?.provider_name, "Atelier Covering Pro");
    assert.equal(withInstaller?.provider_user_id, "provider-user");

    const withoutInstaller = result.reports.find((r) => r.vehicle_id === unquoted);
    assert.equal(withoutInstaller?.provider_name, null);
    assert.equal(withoutInstaller?.provider_user_id, null);

    assert.deepEqual(s.queries, ["incident_reports", "service_quotes", "provider_profiles"]);
  });

  it("keeps listing reports when the installer lookup fails", async () => {
    const s = setup(true, false, { incident_reports: [report(quoted)] });
    s.exports; // ensure module loaded
    const result = (await s.exports.adminListIncidentReports({ context: s.context, data: {} })) as {
      reports: Array<Record<string, unknown>>;
    };
    assert.equal(result.reports.length, 1);
    assert.equal(result.reports[0].provider_name, null);
  });
});

describe("vinyl incident owner photos", () => {
  it("rejects vinyl reports with fewer than 2 photos", async () => {
    const s = setup();
    await assert.rejects(
      s.exports.submitIncidentReport({
        context: s.context,
        data: {
          vehicleId: s.vehicleId,
          incidentType: "decollement_vinyle",
          ownerReportPhotos: [{ base64: "aGVsbG8=", mime: "image/jpeg" }],
        },
      }),
      /Au moins 2 photos/,
    );
  });

  it("stores owner_report_photos and sets status=reported_by_owner for vinyl", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const userId = "reporter-user";
    const vehicleId = "vehicle-id";
    const rows: Record<string, unknown> = {
      owner_profiles: { id: "owner-profile" },
      vehicles: { id: vehicleId, name: "Van Test", owner_id: "owner-profile", driver_id: null },
      incident_reports: { id: "vinyl-incident-id" },
      user_roles: [],
      service_quotes: [],
      provider_profiles: [],
    };
    const admin = {
      from(table: string) {
        const result: { data: unknown; error: null } = { data: rows[table], error: null };
        const chain: Record<string, unknown> = {};
        chain.insert = (payload: Record<string, unknown>) => { inserts.push(payload); return chain; };
        for (const key of ["select", "eq", "update", "limit"]) chain[key] = () => chain;
        chain.order = () => { if (!Array.isArray(result.data)) result.data = []; return chain; };
        chain.in = () => chain;
        chain.single = chain.maybeSingle = async () => result;
        chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
        return chain;
      },
      auth: {
        admin: {
          getUserById: async () => ({ data: { user: { email: "reporter@example.test" } } }),
          listUsers: async () => ({ data: { users: [] } }),
        },
      },
      storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    };
    const exports: Record<string, (input: unknown) => Promise<unknown>> = {};
    new Function("require", "exports", compiled)((name: string) => {
      if (name === "@tanstack/react-start") {
        return { createServerFn: () => { const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn }; return b; } };
      }
      if (name.endsWith("auth-middleware")) return { requireSupabaseAuth: {} };
      if (name.endsWith("rateLimit.server")) return { assertRateLimit: () => {} };
      if (name.endsWith("client.server")) return { supabaseAdmin: admin };
      if (name.endsWith("push-send.server")) return { sendWebPushToUser: async () => {} };
      if (name.endsWith("send.server")) return { sendAppEmail: async () => ({ sent: true }) };
      return require(name);
    }, exports);

    const context = { userId, supabase: { rpc: async () => ({ data: true }) } };
    const result = await exports.submitIncidentReport({
      context,
      data: {
        vehicleId,
        incidentType: "decollement_vinyle",
        ownerReportPhotos: [
          { b64: "aGVsbG8=", mime: "image/jpeg" },
          { b64: "d29ybGQ=", mime: "image/jpeg" },
        ],
      },
    });

    assert.deepEqual(result, { ok: true, id: "vinyl-incident-id" });
    assert.equal(inserts.length, 1, "exactly one INSERT should be performed");
    const payload = inserts[0]!;
    assert.equal(payload["status"], "reported_by_owner", "vinyl incident status must be reported_by_owner");
    assert.ok(Array.isArray(payload["owner_report_photos"]), "owner_report_photos must be an array");
    assert.equal(
      (payload["owner_report_photos"] as string[]).length,
      2,
      "both uploaded photo paths must be stored",
    );
  });
});