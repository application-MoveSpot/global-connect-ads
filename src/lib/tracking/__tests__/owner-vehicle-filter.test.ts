/**
 * Tests d'intégration — rattachement des véhicules à un propriétaire
 *
 * Règle testée : `vehicles.owner_id` référence `owner_profiles.id` (FK
 * `vehicles_owner_id_fkey`), jamais `auth.users.id`. Filtrer les véhicules avec
 * l'identifiant d'authentification ne renvoie donc aucune ligne : il faut
 * d'abord résoudre le profil via `getOwnerProfileId()`.
 *
 * Les utilisateurs sont de vrais comptes de test (l'insertion dans
 * `owner_profiles` déclenche l'attribution de rôle, qui exige un `auth.users`).
 *
 * Prérequis :
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Usage :
 *   npm test
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getOwnerProfileId } from "../../fleet/owner-profile.ts";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const skip = !SUPABASE_URL || !SERVICE_KEY;

const db: SupabaseClient = skip
  ? (null as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const STAMP = Date.now();
const FIXTURE_VEHICLE = "ffffffff-0000-0009-0003-000000000001";

let ownerUserId = "";
let ownerProfileId = "";
let strangerUserId = "";

async function makeUser(label: string): Promise<string> {
  const email = `movespot-test-${label}-${STAMP}@example.test`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  return data.user!.id;
}

async function cleanup() {
  await db.from("vehicles").delete().eq("id", FIXTURE_VEHICLE);
  if (ownerProfileId) await db.from("owner_profiles").delete().eq("id", ownerProfileId);
  for (const id of [ownerUserId, strangerUserId]) {
    if (id) await db.auth.admin.deleteUser(id).catch(() => void 0);
  }
}

describe("rattachement vehicles -> owner_profiles", { skip }, () => {
  before(async () => {
    ownerUserId = await makeUser("owner");
    strangerUserId = await makeUser("stranger");

    const { data: prof, error: ep } = await db
      .from("owner_profiles")
      .insert({ user_id: ownerUserId, full_name: "Propriétaire Test" })
      .select("id")
      .single();
    if (ep) throw new Error(`Setup owner_profiles: ${ep.message}`);
    ownerProfileId = prof.id;

    const { error: ev } = await db.from("vehicles").insert({
      id: FIXTURE_VEHICLE,
      owner_id: ownerProfileId,
      type: "voiture",
      name: "Véhicule Test Suivi",
      price_per_day: 25,
      status: "approved",
    });
    if (ev) throw new Error(`Setup vehicles: ${ev.message}`);
  });

  after(async () => {
    await cleanup();
  });

  it("résout l'identifiant du profil propriétaire depuis l'identifiant authentifié", async () => {
    assert.equal(await getOwnerProfileId(db, ownerUserId), ownerProfileId);
  });

  it("renvoie null quand l'utilisateur n'a aucun profil propriétaire", async () => {
    assert.equal(await getOwnerProfileId(db, strangerUserId), null);
  });

  it("ne trouve aucun véhicule en filtrant directement sur l'identifiant authentifié", async () => {
    const { data, error } = await db
      .from("vehicles")
      .select("id")
      .eq("owner_id", ownerUserId)
      .eq("status", "approved");
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });

  it("trouve les véhicules du propriétaire après résolution du profil", async () => {
    const profileId = await getOwnerProfileId(db, ownerUserId);
    assert.ok(profileId);
    const { data, error } = await db
      .from("vehicles")
      .select("id, name, type, status")
      .eq("owner_id", profileId)
      .eq("status", "approved");
    assert.equal(error, null);
    assert.equal(data?.length, 1);
    assert.equal(data?.[0]?.id, FIXTURE_VEHICLE);
    assert.equal(data?.[0]?.status, "approved");
  });
});
