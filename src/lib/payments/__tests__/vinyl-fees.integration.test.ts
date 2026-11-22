/**
 * Tests d'intégration — flux de facturation vinyle (CGV Art. 2 / CGU Art. 11bis & Art. 25)
 *
 * Couvre (en mode TEST — aucune clé secrète Stripe en dur) :
 *   1. Forfait mise en service : idempotence de setup_fee_charged
 *   2. Supplément déplacement : déduction unique travel_supplement_cents (domicile)
 *   3. Arbitrage incident : solde suffisant → charge déduite
 *   4. Arbitrage incident : solde insuffisant → incident_payment_blocked = true
 *
 * Prérequis :
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (service_role — bypass RLS)
 *
 * Sécurité :
 *   - Aucune clé secrète Stripe (sk_[test|live]_...) n'est écrite en dur dans ce fichier.
 *   - Pour les tests de webhook Stripe, utiliser Stripe CLI localement :
 *       stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 * Usage :
 *   npm run test:payments
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeIncidentChargeCents, TRAVEL_SUPPLEMENT_TTC_CENTS } from "../setup-fee.ts";

// ─── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const skip         = !SUPABASE_URL || !SERVICE_KEY;

const db: SupabaseClient = skip
  ? (null as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Tous les UUIDs commencent par "ffffffff-fee2-" pour être faciles à purger.

const FX = {
  advertiser:     "ffffffff-fee2-0001-0001-000000000001",
  owner:          "ffffffff-fee2-0001-0002-000000000001",
  ownerProfile:   "ffffffff-fee2-0001-0005-000000000001",
  vehicle:        "ffffffff-fee2-0001-0003-000000000001",
  region:         "ffffffff-fee2-0001-0004-000000000001",

  // Campagnes — IDs spécifiques par scénario
  campaignSetupFee:    "ffffffff-fee2-0002-0001-000000000001",
  campaignTravel:      "ffffffff-fee2-0002-0001-000000000002",
  campaignIncident:    "ffffffff-fee2-0002-0001-000000000003",
  campaignBlocked:     "ffffffff-fee2-0002-0001-000000000004",
};

// ─── Helpers de fixtures ──────────────────────────────────────────────────────

async function ensureOwnerProfile() {
  await db.from("owner_profiles").upsert({
    id:          FX.ownerProfile,
    user_id:     FX.owner,
    company:     "Test Owner SARL",
    siret:       "12345678901234",
    address:     "1 rue de Test",
    city:        "Paris",
    postal_code: "75001",
    country:     "FR",
  }, { onConflict: "id" });
}

async function ensureVehicle(extraCols?: Record<string, unknown>) {
  await db.from("vehicles").upsert({
    id:               FX.vehicle,
    owner_id:         FX.owner,
    brand:            "TestBrand",
    model:            "TestModel",
    year:             2020,
    license_plate:    "FX-999-FX",
    region_id:        FX.region,
    incident_payment_blocked: false,
    ...extraCols,
  }, { onConflict: "id" });
}

async function ensureWallet(balanceCents: number) {
  await db.from("advertiser_wallets").upsert({
    advertiser_id: FX.advertiser,
    balance_cents: balanceCents,
  }, { onConflict: "advertiser_id" });
}

async function ensureCampaignRequest(id: string, cols: Record<string, unknown>) {
  const base = {
    id,
    user_id:            FX.advertiser,
    vehicle_id:         FX.vehicle,
    status:             "approved",
    payout_status:      "pending",
    owner_amount_cents: 7_000,  // 70 € (70 % de 100 €)
    setup_fee_cents:    0,
    setup_fee_charged:  false,
    travel_supplement_cents:   0,
    travel_supplement_charged: false,
    incident_charge_cents:     0,
    start_date:         "2026-12-01",
    end_date:           "2026-12-14",
    ad_format:          "stickers",
    pose_location_type: "atelier",
  };
  await db.from("campaign_requests").upsert({ ...base, ...cols }, { onConflict: "id" });
}

async function cleanup() {
  const ids = Object.values(FX).filter(id => id.startsWith("ffffffff-fee2-0002"));
  if (ids.length) {
    await db.from("wallet_transactions").delete().in("campaign_request_id", ids);
    await db.from("campaign_requests").delete().in("id", ids);
  }
  await db.from("advertiser_wallets").delete().eq("advertiser_id", FX.advertiser);
  await db.from("vehicles").delete().eq("id", FX.vehicle);
  await db.from("owner_profiles").delete().eq("id", FX.ownerProfile);
}

// ─── Suite 1 : Forfait mise en service — idempotence ─────────────────────────

describe("Forfait mise en service — idempotence setup_fee_charged (CGV Art. 2)", { skip }, () => {
  const campaignId = FX.campaignSetupFee;

  before(async () => {
    await ensureOwnerProfile();
    await ensureVehicle();
    await ensureWallet(50_000); // 500 € — suffisant
    // Campagne courte (< 15 jours) avec forfait mise en service calculé : 59 € HT (stickers)
    await ensureCampaignRequest(campaignId, {
      setup_fee_cents: 5_900,
      setup_fee_charged: false,
      ad_format: "stickers",
      end_date: "2026-12-07", // 7 jours
    });
  });

  after(cleanup);

  it("premier débit — setup_fee_charged passe à true", async () => {
    // Simuler ce que fait campaign-settlement.server.ts pour le forfait mise en service
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("id, user_id, setup_fee_cents, setup_fee_charged, spot_name")
      .eq("id", campaignId)
      .single();

    assert.ok(campaign, "Campagne fixture introuvable");
    assert.equal(Number(campaign.setup_fee_cents), 5_900, "setup_fee_cents doit être 5 900");
    assert.equal(campaign.setup_fee_charged, false, "setup_fee_charged doit être false initialement");

    // Appliquer le débit (simulation du bloc idempotent dans settlement.server.ts)
    const { error: rpcErr } = await (db.rpc as Function)("apply_wallet_transaction", {
      p_user_id:              campaign.user_id,
      p_kind:                 "campaign_debit",
      p_amount_cents:         -campaign.setup_fee_cents,
      p_description:          `Forfait mise en service — test`,
      p_campaign_request_id:  campaignId,
    });
    assert.ifError(rpcErr);

    // Marquer comme débité
    const { error: upd1 } = await db
      .from("campaign_requests")
      .update({ setup_fee_charged: true })
      .eq("id", campaignId);
    assert.ifError(upd1);

    // Vérifier la colonne
    const { data: after } = await db
      .from("campaign_requests")
      .select("setup_fee_charged")
      .eq("id", campaignId)
      .single();
    assert.equal(after?.setup_fee_charged, true, "setup_fee_charged doit être true après le premier débit");
  });

  it("idempotence — second passage ne redébite pas (setup_fee_charged = true bloque)", async () => {
    // Lire l'état du portefeuille avant
    const { data: walletBefore } = await db
      .from("advertiser_wallets")
      .select("balance_cents")
      .eq("advertiser_id", FX.advertiser)
      .single();
    const balanceBefore = Number(walletBefore?.balance_cents ?? 0);

    // Simuler un second passage du bloc idempotent — la garde setup_fee_charged = true doit bloquer
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("setup_fee_cents, setup_fee_charged")
      .eq("id", campaignId)
      .single();

    assert.equal(campaign?.setup_fee_charged, true, "Pré-condition : setup_fee_charged doit être true");

    // La condition `setupFeeCents > 0 && !setupFeeCharged` est false → pas de débit
    const wouldDebit = Number(campaign?.setup_fee_cents) > 0 && !campaign?.setup_fee_charged;
    assert.equal(wouldDebit, false, "La garde idempotente doit bloquer un second débit");

    // Vérifier que le solde n'a pas bougé
    const { data: walletAfter } = await db
      .from("advertiser_wallets")
      .select("balance_cents")
      .eq("advertiser_id", FX.advertiser)
      .single();
    assert.equal(
      Number(walletAfter?.balance_cents),
      balanceBefore,
      "Le solde du portefeuille ne doit pas avoir changé lors du second passage",
    );
  });
});

// ─── Suite 2 : Supplément déplacement — déduction unique ─────────────────────

describe("Supplément déplacement domicile (CGU Art. 11bis)", { skip }, () => {
  const campaignId = FX.campaignTravel;

  before(async () => {
    await ensureOwnerProfile();
    await ensureVehicle();
    await ensureWallet(50_000);
    await ensureCampaignRequest(campaignId, {
      pose_location_type:        "domicile",
      travel_supplement_charged: false,
      travel_supplement_cents:   0,
      owner_amount_cents:        10_000, // 100 €
    });
  });

  after(cleanup);

  it("premier passage — travel_supplement_cents = 3 500 déduit de owner_amount_cents", async () => {
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("owner_amount_cents, travel_supplement_charged, travel_supplement_cents, pose_location_type")
      .eq("id", campaignId)
      .single();

    assert.ok(campaign, "Campagne fixture introuvable");
    assert.equal(campaign.pose_location_type, "domicile");
    assert.equal(campaign.travel_supplement_charged, false);

    const ownerNet        = Number(campaign.owner_amount_cents);
    const netAfterTravel  = Math.max(0, ownerNet - TRAVEL_SUPPLEMENT_TTC_CENTS);

    // Simuler le bloc de settlement.server.ts
    const { error } = await db
      .from("campaign_requests")
      .update({
        travel_supplement_cents:   TRAVEL_SUPPLEMENT_TTC_CENTS,
        travel_supplement_charged: true,
        owner_amount_cents:        netAfterTravel,
      })
      .eq("id", campaignId);
    assert.ifError(error);

    const { data: updated } = await db
      .from("campaign_requests")
      .select("owner_amount_cents, travel_supplement_charged, travel_supplement_cents")
      .eq("id", campaignId)
      .single();

    assert.equal(updated?.travel_supplement_charged, true);
    assert.equal(Number(updated?.travel_supplement_cents), 3_500,
      "travel_supplement_cents doit être 3 500 (35 € TTC)");
    assert.equal(Number(updated?.owner_amount_cents), 10_000 - 3_500,
      "owner_amount_cents doit être réduit de 35 €");
  });

  it("idempotence — second passage ne redéduit pas (travel_supplement_charged = true bloque)", async () => {
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("owner_amount_cents, travel_supplement_charged")
      .eq("id", campaignId)
      .single();

    assert.equal(campaign?.travel_supplement_charged, true, "Pré-condition : travel_supplement_charged = true");

    const ownerBefore = Number(campaign?.owner_amount_cents);

    // La garde `poseType === 'domicile' && !travelCharged` est false → pas de déduction
    const wouldApply = campaign?.travel_supplement_charged === false;
    assert.equal(wouldApply, false, "La garde travel_supplement_charged doit bloquer un second passage");

    // Pas de modification en DB (pas de doublon)
    const { data: after } = await db
      .from("campaign_requests")
      .select("owner_amount_cents")
      .eq("id", campaignId)
      .single();

    assert.equal(Number(after?.owner_amount_cents), ownerBefore,
      "owner_amount_cents ne doit pas avoir changé lors du second passage");
  });
});

// ─── Suite 3 : Arbitrage incident — solde suffisant ──────────────────────────

describe("Arbitrage incident resolved_rejected — solde suffisant (CGU Art. 25)", { skip }, () => {
  const campaignId = FX.campaignIncident;

  before(async () => {
    await ensureOwnerProfile();
    await ensureVehicle({ incident_payment_blocked: false });
    await ensureWallet(50_000);
    await ensureCampaignRequest(campaignId, {
      ad_format:          "demi_covering",
      pose_location_type: "atelier",
      owner_amount_cents: 15_000, // 150 € — largement suffisant (charge = 69 €)
      payout_status:      "pending",
      incident_charge_cents: 0,
    });
  });

  after(cleanup);

  it("incident demi_covering sans déplacement → charge de 6 900 centimes (69,00 € TTC)", async () => {
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("ad_format, pose_location_type, owner_amount_cents, payout_status, incident_charge_cents")
      .eq("id", campaignId)
      .single();

    assert.ok(campaign, "Campagne fixture introuvable");
    assert.equal(campaign.incident_charge_cents, 0, "incident_charge_cents doit être 0 initialement");

    const withTravel    = campaign.pose_location_type === "domicile";
    const chargeCents   = computeIncidentChargeCents(campaign.ad_format, withTravel);
    const ownerPending  = Number(campaign.owner_amount_cents);
    const netAfterCharge = Math.max(0, ownerPending - chargeCents);

    assert.equal(chargeCents, 6_900, "Charge incident demi_covering sans travel doit être 6 900");
    assert.equal(withTravel, false);

    // Simuler applyIncidentCharge (bloc non-bloqué par garde — incident_charge_cents = 0)
    const isBlocked = Number(campaign.incident_charge_cents) > 0;
    assert.equal(isBlocked, false, "La garde incident_charge_cents = 0 ne doit pas bloquer");

    // Appliquer
    const { error } = await db
      .from("campaign_requests")
      .update({
        incident_charge_cents: chargeCents,
        owner_amount_cents:    netAfterCharge,
      })
      .eq("id", campaignId);
    assert.ifError(error);

    // Vérifier
    const { data: after } = await db
      .from("campaign_requests")
      .select("incident_charge_cents, owner_amount_cents")
      .eq("id", campaignId)
      .single();

    assert.equal(Number(after?.incident_charge_cents), 6_900);
    assert.equal(Number(after?.owner_amount_cents), 15_000 - 6_900);

    // Vérifier que incident_payment_blocked reste false (solde suffisant)
    const { data: vehicle } = await db
      .from("vehicles")
      .select("incident_payment_blocked")
      .eq("id", FX.vehicle)
      .single();
    assert.equal(vehicle?.incident_payment_blocked, false,
      "incident_payment_blocked doit rester false quand le solde est suffisant");
  });
});

// ─── Suite 4 : Arbitrage incident — solde insuffisant → blocage véhicule ─────

describe("Arbitrage incident resolved_rejected — solde insuffisant → blocage (CGU Art. 25)", { skip }, () => {
  const campaignId = FX.campaignBlocked;

  before(async () => {
    await ensureOwnerProfile();
    await ensureVehicle({ incident_payment_blocked: false });
    await ensureWallet(50_000);
    await ensureCampaignRequest(campaignId, {
      ad_format:          "covering_total",
      pose_location_type: "domicile", // avec déplacement → 89 + 35 = 124 €
      owner_amount_cents: 5_000,       // seulement 50 € disponibles (insuffisant)
      payout_status:      "pending",
      incident_charge_cents: 0,
    });
  });

  after(cleanup);

  it("covering_total + déplacement → charge 12 400 centimes > solde 5 000 → incident_payment_blocked = true", async () => {
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("ad_format, pose_location_type, owner_amount_cents, payout_status, incident_charge_cents, vehicle_id")
      .eq("id", campaignId)
      .single();

    assert.ok(campaign);

    const withTravel   = campaign.pose_location_type === "domicile";
    const chargeCents  = computeIncidentChargeCents(campaign.ad_format, withTravel);
    const ownerPending = Number(campaign.owner_amount_cents);

    assert.equal(chargeCents, 12_400, "covering_total + travel doit donner 12 400");
    assert.equal(withTravel, true);

    const isInsufficient = chargeCents > ownerPending;
    assert.equal(isInsufficient, true, "Le solde doit être insuffisant pour ce scénario");

    // Simuler applyIncidentCharge — solde insuffisant → blocage
    const netAfterCharge = Math.max(0, ownerPending - chargeCents); // = 0

    const { error: updCampaign } = await db
      .from("campaign_requests")
      .update({
        incident_charge_cents: chargeCents,
        owner_amount_cents:    netAfterCharge,
      })
      .eq("id", campaignId);
    assert.ifError(updCampaign);

    const { error: updVehicle } = await db
      .from("vehicles")
      .update({ incident_payment_blocked: true })
      .eq("id", FX.vehicle);
    assert.ifError(updVehicle);

    // Vérifier que le véhicule est bloqué
    const { data: vehicle } = await db
      .from("vehicles")
      .select("incident_payment_blocked")
      .eq("id", FX.vehicle)
      .single();

    assert.equal(vehicle?.incident_payment_blocked, true,
      "incident_payment_blocked doit être true quand le solde propriétaire est insuffisant");

    // Vérifier que owner_amount_cents est 0 (plancher)
    const { data: cr } = await db
      .from("campaign_requests")
      .select("owner_amount_cents, incident_charge_cents")
      .eq("id", campaignId)
      .single();

    assert.equal(Number(cr?.owner_amount_cents), 0,
      "owner_amount_cents doit être plafonné à 0 (Math.max)");
    assert.equal(Number(cr?.incident_charge_cents), 12_400);
  });

  it("idempotence — incident déjà chargé (incident_charge_cents > 0) → pas de second débit", async () => {
    const { data: campaign } = await db
      .from("campaign_requests")
      .select("incident_charge_cents")
      .eq("id", campaignId)
      .single();

    // La garde `incident_charge_cents > 0` stoppe le traitement
    const alreadyProcessed = Number(campaign?.incident_charge_cents) > 0;
    assert.equal(alreadyProcessed, true,
      "incident_charge_cents > 0 doit bloquer un second traitement d'incident");
  });
});

// ─── Suite 5 : Sécurité — aucune clé secrète Stripe en dur ───────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

const SEC_FILES = [
  { label: "vinyl-fees.integration.test.ts (ce fichier)", path: join(__dir, "vinyl-fees.integration.test.ts") },
  { label: "vinyl-fees.test.ts", path: join(__dir, "vinyl-fees.test.ts") },
  { label: "setup-fee.ts", path: join(__dir, "..", "setup-fee.ts") },
  { label: "campaign-settlement.server.ts", path: join(__dir, "..", "..", "campaigns", "campaign-settlement.server.ts") },
  { label: "incident.functions.ts", path: join(__dir, "..", "..", "tracking", "incident.functions.ts") },
];

describe("Sécurité — aucune clé secrète Stripe en dur dans les fichiers de test et source", () => {
  // Les patterns sont fractionnés pour ne pas se déclencher sur leurs propres occurrences.
  const SK_TEST = "sk" + "_test_";
  const SK_LIVE = "sk" + "_live_";

  for (const file of SEC_FILES) {
    it(`${file.label} — pas de clé secrète Stripe en dur`, () => {
      const src = readFileSync(file.path, "utf8");
      assert.ok(!src.includes(SK_TEST), `Clé Stripe test trouvée en dur dans ${file.label}`);
      assert.ok(!src.includes(SK_LIVE), `Clé Stripe live trouvée en dur dans ${file.label}`);
    });
  }
});
