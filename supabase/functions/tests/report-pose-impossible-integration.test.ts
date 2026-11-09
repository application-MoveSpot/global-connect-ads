/**
 * Integration tests: report-pose-impossible Edge Function
 *
 * Validates:
 *   1. Schema — fault_cause column accepted by installation_missions
 *   2. Schema — owner_penalties INSERT accepted
 *   3. Constraint — refund_pose_impossible job_type accepted by pm_jobs
 *   4. Constraint — penalty_owner_fault job_type accepted by pm_jobs
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno test --allow-env --allow-net \
 *     supabase/functions/tests/report-pose-impossible-integration.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  Deno.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient(SUPABASE_URL, SERVICE_KEY) as any;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createTestCampaign(): Promise<string> {
  const { data, error } = await db
    .from("campaign_requests")
    .insert({
      title:               `[TEST] pose-impossible - ${Date.now()}`,
      status:              "active",
      pm_status:           "active",
      advertiser_user_id:  "00000000-0000-0000-0000-000000000001",
      budget_eur:          100,
      owner_amount_cents:  5000,
      payout_status:       "unpaid",
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestCampaign: ${error.message}`);
  return data.id as string;
}

async function createTestMission(campaignId: string): Promise<string> {
  const { data, error } = await db
    .from("installation_missions")
    .insert({
      campaign_request_id: campaignId,
      mission_type:        "pose",
      status:              "in_progress",
      payee_user_id:       "00000000-0000-0000-0000-000000000002",
      fee_cents:           2500,
      location_lat:        48.8566,
      location_lng:        2.3522,
      location_address:    "Test address",
      location_city:       "Paris",
      scheduled_date:      "2027-06-01",
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestMission: ${error.message}`);
  return data.id as string;
}

async function cleanup(campaignId: string, missionId?: string) {
  if (missionId) {
    await db.from("pm_jobs").delete().contains("payload", { mission_id: missionId });
    await db.from("owner_penalties").delete().eq("mission_id", missionId);
    await db.from("installation_missions").delete().eq("id", missionId);
  }
  await db.from("campaign_requests").delete().eq("id", campaignId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 : fault_cause column exists and accepts valid values
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("installation_missions: fault_cause column accepts valid values", async () => {
  const campaignId = await createTestCampaign();
  const missionId  = await createTestMission(campaignId);

  try {
    const { error } = await db
      .from("installation_missions")
      .update({ fault_cause: "vehicle_dirty" })
      .eq("id", missionId);

    assertEquals(error, null, `Expected no error updating fault_cause, got: ${error?.message}`);

    const { data: row } = await db
      .from("installation_missions")
      .select("fault_cause")
      .eq("id", missionId)
      .single();

    assertEquals(row?.fault_cause, "vehicle_dirty");
    console.log("✅ fault_cause column accepted 'vehicle_dirty'");
  } finally {
    await cleanup(campaignId, missionId);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 : owner_penalties table accepts INSERT
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("owner_penalties: INSERT is accepted with correct schema", async () => {
  const campaignId = await createTestCampaign();
  const missionId  = await createTestMission(campaignId);

  try {
    const { error } = await db.from("owner_penalties").insert({
      owner_user_id:       "00000000-0000-0000-0000-000000000003",
      campaign_request_id: campaignId,
      mission_id:          missionId,
      fault_cause:         "vehicle_absent",
      amount_eur:          30,
      status:              "pending",
    });

    assertEquals(error, null, `Expected no error inserting owner_penalty, got: ${error?.message}`);

    const { data: rows } = await db
      .from("owner_penalties")
      .select("id, fault_cause, amount_eur, status")
      .eq("mission_id", missionId);

    assertExists(rows);
    assertEquals(rows!.length, 1);
    assertEquals(rows![0].fault_cause, "vehicle_absent");
    assertEquals(Number(rows![0].amount_eur), 30);
    assertEquals(rows![0].status, "pending");
    console.log("✅ owner_penalties INSERT accepted, id:", rows![0].id);
  } finally {
    await cleanup(campaignId, missionId);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 : pm_jobs accepts 'refund_pose_impossible' job_type
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("pm_jobs constraint: 'refund_pose_impossible' job_type is accepted", async () => {
  const campaignId = await createTestCampaign();
  const missionId  = await createTestMission(campaignId);

  try {
    const { error } = await db.from("pm_jobs").insert({
      campaign_request_id: campaignId,
      job_type:            "refund_pose_impossible",
      status:              "pending",
      user_id:             "00000000-0000-0000-0000-000000000002",
      payload: { mission_id: missionId, fault_cause: "other", reason: "Test reason for integration test" },
    });

    assertEquals(error, null, `Expected no error, got: ${error?.message}`);

    const { data: rows } = await db
      .from("pm_jobs")
      .select("id, job_type, status")
      .eq("job_type", "refund_pose_impossible")
      .eq("campaign_request_id", campaignId);

    assertExists(rows);
    assertEquals(rows!.length, 1);
    assertEquals(rows![0].job_type, "refund_pose_impossible");
    console.log("✅ refund_pose_impossible pm_job accepted, id:", rows![0].id);
  } finally {
    await cleanup(campaignId, missionId);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 : pm_jobs accepts 'penalty_owner_fault' job_type
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("pm_jobs constraint: 'penalty_owner_fault' job_type is accepted", async () => {
  const campaignId = await createTestCampaign();
  const missionId  = await createTestMission(campaignId);

  try {
    const { error } = await db.from("pm_jobs").insert({
      campaign_request_id: campaignId,
      job_type:            "penalty_owner_fault",
      status:              "pending",
      user_id:             "00000000-0000-0000-0000-000000000002",
      payload: { owner_user_id: "00000000-0000-0000-0000-000000000003", mission_id: missionId, fault_cause: "vehicle_dirty", amount_eur: 30 },
    });

    assertEquals(error, null, `Expected no error, got: ${error?.message}`);

    const { data: rows } = await db
      .from("pm_jobs")
      .select("id, job_type, status")
      .eq("job_type", "penalty_owner_fault")
      .eq("campaign_request_id", campaignId);

    assertExists(rows);
    assertEquals(rows!.length, 1);
    assertEquals(rows![0].job_type, "penalty_owner_fault");
    console.log("✅ penalty_owner_fault pm_job accepted, id:", rows![0].id);
  } finally {
    await cleanup(campaignId, missionId);
  }
});
