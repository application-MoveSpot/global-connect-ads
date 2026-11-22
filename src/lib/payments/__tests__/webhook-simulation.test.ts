/**
 * Simulation webhook Stripe — forge des événements signés HMAC-SHA256
 * sans avoir besoin du Stripe CLI ni d'un compte live.
 *
 * Prérequis :
 *   STRIPE_SECRET_KEY       — clé test  (sk_test_... via process.env uniquement)
 *   STRIPE_WEBHOOK_SECRET   — secret de signature  (whsec_...)
 *   TEST_WEBHOOK_URL        — endpoint HTTP à tester (ex: http://localhost:3000/api/webhooks/stripe)
 *   SUPABASE_URL            — optionnel : active la vérification en base après webhook
 *   SUPABASE_SERVICE_ROLE_KEY — optionnel : nécessaire pour la vérification en base
 *
 * Sécurité : aucune clé secrète Stripe n'est écrite en dur dans ce fichier.
 * Les clés sk_[test|live]_ ne sont jamais présentes en clair — uniquement via process.env.
 *
 * Usage :
 *   npm run test:webhooks
 *
 * En CI : le test est automatiquement sauté si STRIPE_SECRET_KEY ou TEST_WEBHOOK_URL
 * ne sont pas définis (secrets manquants).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Configuration ────────────────────────────────────────────────────────────

const STRIPE_KEY      = process.env.STRIPE_SECRET_KEY ?? "";
const WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_local_simulation_secret";
const WEBHOOK_URL     = process.env.TEST_WEBHOOK_URL ?? "";
const SUPABASE_URL    = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const skipWebhook = !STRIPE_KEY || !WEBHOOK_URL;
const skipDB      = !SUPABASE_URL || !SERVICE_KEY;

// Le SDK Stripe est instancié sans appel réseau — sert uniquement à générer les signatures HMAC.
const stripe = skipWebhook
  ? (null as unknown as Stripe)
  : new Stripe(STRIPE_KEY, { apiVersion: "2024-12-18.acacia" });

const db: SupabaseClient = skipDB
  ? (null as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FX = {
  advertiser:   "ffffffff-whk1-0001-0001-000000000001",
  owner:        "ffffffff-whk1-0001-0002-000000000001",
  ownerProfile: "ffffffff-whk1-0001-0005-000000000001",
  vehicle:      "ffffffff-whk1-0001-0003-000000000001",
  region:       "ffffffff-whk1-0001-0004-000000000001",
  campaign:     "ffffffff-whk1-0002-0001-000000000001",
};

async function createFixtures() {
  if (skipDB) return;

  await db.from("owner_profiles").upsert({
    id: FX.ownerProfile, user_id: FX.owner,
    company: "WebhookTest SARL", siret: "98765432109876",
    address: "2 rue du Test", city: "Lyon", postal_code: "69001", country: "FR",
  }, { onConflict: "id" });

  await db.from("vehicles").upsert({
    id: FX.vehicle, owner_id: FX.owner,
    brand: "WebhookBrand", model: "WHKModel", year: 2021,
    license_plate: "WH-001-WH", region_id: FX.region,
    incident_payment_blocked: false,
  }, { onConflict: "id" });

  await db.from("advertiser_wallets").upsert({
    advertiser_id: FX.advertiser,
    balance_cents: 100_000, // 1 000 €
  }, { onConflict: "advertiser_id" });

  // Campagne < 15 jours, pose à domicile, format demi_covering
  // setup_fee_cents = 7900 (79 € HT), travel_supplement sera 3500 (35 € TTC)
  await db.from("campaign_requests").upsert({
    id:                       FX.campaign,
    user_id:                  FX.advertiser,
    vehicle_id:               FX.vehicle,
    status:                   "approved",
    payout_status:            "pending",
    ad_format:                "demi_covering",
    pose_location_type:       "domicile",
    setup_fee_cents:          7_900,
    setup_fee_charged:        false,
    travel_supplement_cents:  0,
    travel_supplement_charged: false,
    incident_charge_cents:    0,
    owner_amount_cents:       14_000, // 140 € (70 % de 200 €)
    start_date:               "2026-12-01",
    end_date:                 "2026-12-10", // 9 jours < 15
  }, { onConflict: "id" });
}

async function cleanupFixtures() {
  if (skipDB) return;
  await db.from("wallet_transactions").delete().in("campaign_request_id", [FX.campaign]);
  await db.from("campaign_requests").delete().eq("id", FX.campaign);
  await db.from("advertiser_wallets").delete().eq("advertiser_id", FX.advertiser);
  await db.from("vehicles").delete().eq("id", FX.vehicle);
  await db.from("owner_profiles").delete().eq("id", FX.ownerProfile);
}

// ─── Helper : forge un événement Stripe signé HMAC-SHA256 ────────────────────

function buildSignedEvent(eventPayload: Record<string, unknown>): {
  rawBody: string;
  headers: Record<string, string>;
} {
  const rawBody = JSON.stringify(eventPayload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: WEBHOOK_SECRET,
  });
  return {
    rawBody,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  };
}

function makePaymentSucceededEvent(overrides?: Partial<{
  eventId: string;
  campaignRequestId: string;
  amount: number;
  poseLocationType: string;
  adFormat: string;
}>) {
  const o = overrides ?? {};
  return {
    id:           o.eventId ?? `evt_sim_${Date.now()}`,
    object:       "event",
    api_version:  "2024-12-18.acacia",
    created:      Math.floor(Date.now() / 1000),
    type:         "payment_intent.succeeded",
    data: {
      object: {
        id:       `pi_sim_${Date.now()}`,
        object:   "payment_intent",
        amount:   o.amount ?? 20_000, // 200 € campagne
        currency: "eur",
        status:   "succeeded",
        metadata: {
          campaign_request_id: o.campaignRequestId ?? FX.campaign,
          pose_location_type:  o.poseLocationType ?? "domicile",
          ad_format:           o.adFormat ?? "demi_covering",
        },
      },
    },
  };
}

// ─── Suite 1 : Vérification de signature ─────────────────────────────────────

describe("Webhook Stripe — vérification de signature", { skip: skipWebhook }, () => {
  it("rejette une signature invalide avec HTTP 400", async () => {
    const event = makePaymentSucceededEvent();

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=123456,v1=invalide_forged_signature_xxx",
      },
      body: JSON.stringify(event),
    });

    assert.equal(res.status, 400,
      `Signature invalide : attendu 400, reçu ${res.status}`);
  });

  it("rejette un body altéré après signature (tamper-check)", async () => {
    const event = makePaymentSucceededEvent();
    const { headers } = buildSignedEvent(event);

    // On signe l'original mais on envoie un body modifié
    const tamperedBody = JSON.stringify({ ...event, type: "payment_intent.payment_failed" });

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: tamperedBody,
    });

    assert.equal(res.status, 400,
      `Body altéré : attendu 400, reçu ${res.status}`);
  });
});

// ─── Suite 2 : payment_intent.succeeded — forfait mise en service ─────────────

describe("Webhook payment_intent.succeeded — forfait mise en service + idempotence", { skip: skipWebhook }, () => {
  const eventId = `evt_sim_setup_fee_${Date.now()}`;

  before(createFixtures);
  after(cleanupFixtures);

  it("1er envoi → HTTP 200, traitement du règlement", async () => {
    const event = makePaymentSucceededEvent({ eventId, campaignRequestId: FX.campaign });
    const { rawBody, headers } = buildSignedEvent(event);

    const res = await fetch(WEBHOOK_URL, { method: "POST", headers, body: rawBody });
    assert.equal(res.status, 200,
      `1er envoi : attendu 200, reçu ${res.status} — ${await res.text()}`);
  });

  it("2e envoi (rejeu identique) → HTTP 200 sans redébit (idempotence Stripe event ID)", async () => {
    // On renvoie exactement le même eventId — le handler doit détecter le doublon
    const event = makePaymentSucceededEvent({ eventId, campaignRequestId: FX.campaign });
    const { rawBody, headers } = buildSignedEvent(event);

    const res = await fetch(WEBHOOK_URL, { method: "POST", headers, body: rawBody });
    assert.equal(res.status, 200,
      `Rejeu : attendu 200, reçu ${res.status}`);
  });

  it("vérification en base — setup_fee_charged = true après 1er envoi", { skip: skipDB }, async () => {
    const { data } = await db
      .from("campaign_requests")
      .select("setup_fee_charged")
      .eq("id", FX.campaign)
      .single();

    assert.equal(data?.setup_fee_charged, true,
      "setup_fee_charged doit être true après traitement du webhook");
  });

  it("vérification en base — travel_supplement_charged = true (pose domicile)", { skip: skipDB }, async () => {
    const { data } = await db
      .from("campaign_requests")
      .select("travel_supplement_charged, travel_supplement_cents")
      .eq("id", FX.campaign)
      .single();

    assert.equal(data?.travel_supplement_charged, true,
      "travel_supplement_charged doit être true pour pose = domicile");
    assert.equal(Number(data?.travel_supplement_cents), 3_500,
      "travel_supplement_cents doit être 3 500 (35 € TTC)");
  });

  it("vérification en base — wallet_transactions : un seul débit setup fee (pas de doublon)", { skip: skipDB }, async () => {
    const { data } = await db
      .from("wallet_transactions")
      .select("id, amount_cents, kind")
      .eq("campaign_request_id", FX.campaign)
      .eq("kind", "campaign_debit");

    const setupFeeDebits = (data ?? []).filter(
      t => Number(t.amount_cents) === -7_900,
    );
    assert.equal(setupFeeDebits.length, 1,
      `Exactement 1 débit setup fee (-7 900 cts) attendu, reçu ${setupFeeDebits.length}`);
  });
});

// ─── Suite 3 : Événement non géré — doit être ignoré proprement ──────────────

describe("Webhook — événements non gérés", { skip: skipWebhook }, () => {
  it("customer.subscription.created → HTTP 200 (ignoré silencieusement)", async () => {
    const unhandledEvent = {
      id:          `evt_unhandled_${Date.now()}`,
      object:      "event",
      api_version: "2024-12-18.acacia",
      created:     Math.floor(Date.now() / 1000),
      type:        "customer.subscription.created",
      data:        { object: { id: "sub_test", object: "subscription" } },
    };

    const { rawBody, headers } = buildSignedEvent(unhandledEvent);
    const res = await fetch(WEBHOOK_URL, { method: "POST", headers, body: rawBody });

    // Le handler doit retourner 200 pour signaler à Stripe qu'il a reçu l'événement.
    // Un 4xx ou 5xx provoquerait des réessais Stripe indésirables.
    assert.equal(res.status, 200,
      `Événement non géré : attendu 200 (acknowledgement), reçu ${res.status}`);
  });
});
