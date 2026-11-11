/**
 * Tests d'intégration — fonctions SQL paiement
 *
 * Prérequis :
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Usage :
 *   npm run test:payments
 *
 * Les tests s'appuient sur la service-role key pour créer/détruire les
 * fixtures sans être bloqués par RLS.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Configuration ────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const skip = !SUPABASE_URL || !SERVICE_KEY;

const db: SupabaseClient = skip
  ? (null as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Constantes de fixtures ───────────────────────────────────────────────────
const FX = {
  // Annonceurs (advertiser_wallets.advertiser_id)
  advertiserA: "ffffffff-0000-0001-0001-000000000001",
  advertiserB: "ffffffff-0000-0001-0001-000000000002",
  // Propriétaires (owner_profiles.user_id = vehicles.owner_id)
  ownerUserA:  "ffffffff-0000-0001-0002-000000000001",
  ownerUserB:  "ffffffff-0000-0001-0002-000000000002",
  // owner_profiles.id (PK)
  ownerProfA:  "ffffffff-0000-0001-0005-000000000001",
  ownerProfB:  "ffffffff-0000-0001-0005-000000000002",
  // Véhicules
  vehicleA:    "ffffffff-0000-0001-0003-000000000001",
  vehicleB:    "ffffffff-0000-0001-0003-000000000002",
  // Région (UUID libre, pas de FK)
  region:      "ffffffff-0000-0001-0004-000000000001",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function cleanupCampaignFixtures() {
  // Ordre de suppression respectant les FK
  await db.from("campaign_allocations").delete().like("campaign_id", "ffffffff%");
  await db.from("bank_transfer_requests").delete().like("user_id", "ffffffff%");
  await db.from("campaigns").delete().like("advertiser_id", "ffffffff%");
  await db.from("advertiser_wallets").delete().like("advertiser_id", "ffffffff%");
}

async function cleanupOwnerFixtures() {
  await db.from("vehicles").delete().eq("id", FX.vehicleA);
  await db.from("vehicles").delete().eq("id", FX.vehicleB);
  await db.from("owner_profiles").delete().eq("id", FX.ownerProfA);
  await db.from("owner_profiles").delete().eq("id", FX.ownerProfB);
}

async function cleanupCronFixtures() {
  await db.from("admin_cron_logs").delete().eq("job_name", "test-job-integration");
  await db.from("admin_cron_logs").delete().eq("job_name", "expire-campaigns-nightly-test");
}

// ─── Suite 1 : process_campaign_wallet_payment() ─────────────────────────────
describe("process_campaign_wallet_payment()", { skip }, () => {
  before(async () => {
    await cleanupCampaignFixtures();
    // Crée deux portefeuilles d'annonceurs
    const { error } = await db.from("advertiser_wallets").insert([
      { advertiser_id: FX.advertiserA, balance: 200.0 },
      { advertiser_id: FX.advertiserB, balance: 30.0 },
    ]);
    if (error) throw new Error(`Setup advertiser_wallets: ${error.message}`);
  });

  after(cleanupCampaignFixtures);

  it("débit nominal — solde débité et campagne créée", async () => {
    const { data, error } = await db.rpc("process_campaign_wallet_payment", {
      p_advertiser_id: FX.advertiserA,
      p_amount:        100.0,
      p_region_id:     FX.region,
      p_start_date:    "2027-01-01",
      p_end_date:      "2027-01-31",
    });

    assert.ifError(error);
    assert.strictEqual(data.success, true, "La fonction doit retourner success=true");
    assert.ok(data.campaign_id, "Un campaign_id doit être retourné");

    // Vérifier que le solde a bien été débité
    const { data: wallet } = await db
      .from("advertiser_wallets")
      .select("balance")
      .eq("advertiser_id", FX.advertiserA)
      .single();
    assert.strictEqual(
      Number(wallet!.balance),
      100.0,
      "Le solde doit passer de 200 à 100"
    );

    // Vérifier que la campagne est bien enregistrée
    const { data: campaign } = await db
      .from("campaigns")
      .select("status, total_cost")
      .eq("id", data.campaign_id)
      .single();
    assert.strictEqual(campaign!.status, "pending_allocation");
    assert.strictEqual(Number(campaign!.total_cost), 100.0);
  });

  it("solde insuffisant — retour d'erreur et rollback atomique", async () => {
    const balanceBefore = 30.0;
    const { data, error } = await db.rpc("process_campaign_wallet_payment", {
      p_advertiser_id: FX.advertiserB,
      p_amount:        50.0, // > 30 solde
      p_region_id:     FX.region,
      p_start_date:    "2027-02-01",
      p_end_date:      "2027-02-28",
    });

    assert.ifError(error);
    assert.strictEqual(data.success, false);
    assert.ok(
      data.error?.includes("insuffisant") || data.error?.includes("Solde"),
      `Message d'erreur attendu, reçu : ${data.error}`
    );

    // Le solde ne doit PAS avoir changé
    const { data: wallet } = await db
      .from("advertiser_wallets")
      .select("balance")
      .eq("advertiser_id", FX.advertiserB)
      .single();
    assert.strictEqual(
      Number(wallet!.balance),
      balanceBefore,
      "Le solde doit rester inchangé après un refus"
    );

    // Aucune campagne ne doit avoir été créée pour cet annonceur
    const { count } = await db
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", FX.advertiserB);
    assert.strictEqual(count, 0, "Aucune campagne ne doit exister pour B");
  });

  it("double soumission concurrente — FOR UPDATE protège contre le double-spend", async () => {
    // Réinitialise le solde de A à 60€ pour ce test
    await db
      .from("advertiser_wallets")
      .update({ balance: 60.0 })
      .eq("advertiser_id", FX.advertiserA);

    // Lance deux paiements de 50€ en parallèle
    const [res1, res2] = await Promise.all([
      db.rpc("process_campaign_wallet_payment", {
        p_advertiser_id: FX.advertiserA,
        p_amount:        50.0,
        p_region_id:     FX.region,
        p_start_date:    "2027-03-01",
        p_end_date:      "2027-03-31",
      }),
      db.rpc("process_campaign_wallet_payment", {
        p_advertiser_id: FX.advertiserA,
        p_amount:        50.0,
        p_region_id:     FX.region,
        p_start_date:    "2027-04-01",
        p_end_date:      "2027-04-30",
      }),
    ]);

    // L'une des deux doit réussir, l'autre échouer (solde insuffisant)
    const successes = [res1.data, res2.data].filter((d) => d?.success === true);
    const failures  = [res1.data, res2.data].filter((d) => d?.success === false);
    assert.ok(
      successes.length <= 1,
      "Au plus un paiement concurrent doit réussir sur solde insuffisant pour deux"
    );
    assert.ok(
      successes.length + failures.length === 2,
      "Les deux appels doivent retourner un résultat"
    );

    // Le solde résultant doit être ≥ 0
    const { data: wallet } = await db
      .from("advertiser_wallets")
      .select("balance")
      .eq("advertiser_id", FX.advertiserA)
      .single();
    assert.ok(
      Number(wallet!.balance) >= 0,
      `Le solde ne doit pas être négatif, valeur : ${wallet!.balance}`
    );
  });
});

// ─── Suite 2 : process_expired_campaigns_payouts() ───────────────────────────
describe("process_expired_campaigns_payouts()", { skip }, () => {
  let campaignIdWith2Owners: string;
  let campaignIdNoStripe: string;

  before(async () => {
    await cleanupCampaignFixtures();
    await cleanupOwnerFixtures();

    // --- Profils propriétaires ---
    const { error: epA } = await db.from("owner_profiles").insert({
      id:                        FX.ownerProfA,
      user_id:                   FX.ownerUserA,
      full_name:                 "Owner Test A",
      stripe_connect_account_id: "acct_test_ownerA",
      stripe_payouts_enabled:    true,
      stripe_charges_enabled:    false,
      stripe_details_submitted:  true,
      vigilance_statut:          "normal",
      vigilance_gains_cumules_centimes: 0,
    });
    if (epA) throw new Error(`Setup ownerProfA: ${epA.message}`);

    const { error: epB } = await db.from("owner_profiles").insert({
      id:                        FX.ownerProfB,
      user_id:                   FX.ownerUserB,
      full_name:                 "Owner Test B",
      stripe_connect_account_id: "acct_test_ownerB",
      stripe_payouts_enabled:    true,
      stripe_charges_enabled:    false,
      stripe_details_submitted:  true,
      vigilance_statut:          "normal",
      vigilance_gains_cumules_centimes: 0,
    });
    if (epB) throw new Error(`Setup ownerProfB: ${epB.message}`);

    // --- Véhicules ---
    const { error: evA } = await db.from("vehicles").insert({
      id:          FX.vehicleA,
      owner_id:    FX.ownerUserA, // = owner_profiles.user_id
      type:        "voiture",
      name:        "Vehicle Test A",
      price_per_day: 10,
      status:      "approved",
    });
    if (evA) throw new Error(`Setup vehicleA: ${evA.message}`);

    const { error: evB } = await db.from("vehicles").insert({
      id:          FX.vehicleB,
      owner_id:    FX.ownerUserB,
      type:        "voiture",
      name:        "Vehicle Test B",
      price_per_day: 10,
      status:      "approved",
    });
    if (evB) throw new Error(`Setup vehicleB: ${evB.message}`);

    // --- Campagne expirée avec 2 propriétaires (1000€ total) ---
    const { data: c1, error: ec1 } = await db
      .from("campaigns")
      .insert({
        advertiser_id: FX.advertiserA,
        region_id:     FX.region,
        start_date:    "2026-01-01",
        end_date:      "2026-01-31", // expirée
        total_cost:    1000.0,
        status:        "active",
      })
      .select("id")
      .single();
    if (ec1) throw new Error(`Setup campaign1: ${ec1.message}`);
    campaignIdWith2Owners = c1!.id;

    await db.from("campaign_allocations").insert([
      { campaign_id: campaignIdWith2Owners, vehicle_id: FX.vehicleA },
      { campaign_id: campaignIdWith2Owners, vehicle_id: FX.vehicleB },
    ]);

    // --- Campagne expirée : propriétaire SANS stripe_connect_account_id ---
    // On crée un 3ᵉ owner sans Stripe
    const ownerNoStripeUser = "ffffffff-0000-0001-0002-000000000003";
    const ownerNoStripeProf = "ffffffff-0000-0001-0005-000000000003";
    const vehicleNoStripe   = "ffffffff-0000-0001-0003-000000000003";

    await db.from("owner_profiles").insert({
      id:                        ownerNoStripeProf,
      user_id:                   ownerNoStripeUser,
      full_name:                 "Owner No Stripe",
      stripe_connect_account_id: null,
      stripe_payouts_enabled:    false,
      stripe_charges_enabled:    false,
      stripe_details_submitted:  false,
      vigilance_statut:          "normal",
      vigilance_gains_cumules_centimes: 0,
    });
    await db.from("vehicles").insert({
      id:          vehicleNoStripe,
      owner_id:    ownerNoStripeUser,
      type:        "voiture",
      name:        "Vehicle No Stripe",
      price_per_day: 10,
      status:      "approved",
    });

    const { data: c2, error: ec2 } = await db
      .from("campaigns")
      .insert({
        advertiser_id: FX.advertiserA,
        region_id:     FX.region,
        start_date:    "2026-02-01",
        end_date:      "2026-02-28",
        total_cost:    500.0,
        status:        "active",
      })
      .select("id")
      .single();
    if (ec2) throw new Error(`Setup campaign2: ${ec2.message}`);
    campaignIdNoStripe = c2!.id;

    await db.from("campaign_allocations").insert({
      campaign_id: campaignIdNoStripe,
      vehicle_id:  vehicleNoStripe,
    });
  });

  after(async () => {
    // Cleanup extra fixtures
    await db.from("campaign_allocations").delete().like("campaign_id", "ffffffff%");
    await db.from("bank_transfer_requests").delete().like("user_id", "ffffffff%");
    await db.from("campaigns").delete().like("advertiser_id", "ffffffff%");
    await db.from("vehicles").delete().like("id", "ffffffff%");
    await db.from("owner_profiles").delete().like("id", "ffffffff%");
  });

  it("calcul 70 % — chaque propriétaire reçoit 350 € pour 1000 € à 2 owners", async () => {
    const { data, error } = await db.rpc("process_expired_campaigns_payouts");

    assert.ifError(error);
    assert.strictEqual(data.success, true);
    // Les deux campagnes expirées sont traitées
    assert.ok(
      data.processed_campaigns_count >= 2,
      `Au moins 2 campagnes traitées, reçu : ${data.processed_campaigns_count}`
    );

    // Vérifier les montants pour campaignIdWith2Owners
    const { data: transfers } = await db
      .from("bank_transfer_requests")
      .select("user_id, amount_cents, stripe_account_id")
      .in("user_id", [FX.ownerUserA, FX.ownerUserB])
      .order("user_id");

    assert.ok(transfers && transfers.length >= 2, "Au moins 2 virements générés");

    // 70 % de 1000 / 2 propriétaires = 350 €  → 35 000 centimes
    for (const t of transfers) {
      assert.strictEqual(
        Number(t.amount_cents),
        35000,
        `Montant incorrect pour ${t.user_id} : ${t.amount_cents} centimes (attendu 35000)`
      );
      assert.ok(
        t.stripe_account_id?.startsWith("acct_"),
        "stripe_account_id doit être renseigné"
      );
    }
  });

  it("exclusion sans stripe_account_id — aucun virement généré pour owner sans Stripe", async () => {
    const ownerNoStripeUser = "ffffffff-0000-0001-0002-000000000003";

    const { data: transfers } = await db
      .from("bank_transfer_requests")
      .select("id")
      .eq("user_id", ownerNoStripeUser);

    assert.strictEqual(
      transfers?.length ?? 0,
      0,
      "Aucun virement ne doit exister pour un propriétaire sans Stripe Connect"
    );
  });

  it("idempotence — les campagnes completed ne sont pas retraitées", async () => {
    // Première exécution déjà faite dans le test précédent — les campagnes sont 'completed'
    const { data: before } = await db
      .from("bank_transfer_requests")
      .select("id", { count: "exact" })
      .in("user_id", [FX.ownerUserA, FX.ownerUserB]);
    const countBefore = before?.length ?? 0;

    // Deuxième exécution
    const { data, error } = await db.rpc("process_expired_campaigns_payouts");
    assert.ifError(error);
    assert.strictEqual(data.success, true);
    assert.strictEqual(
      data.processed_campaigns_count,
      0,
      "Aucune campagne ne doit être retraitée (statut déjà 'completed')"
    );

    const { data: after } = await db
      .from("bank_transfer_requests")
      .select("id")
      .in("user_id", [FX.ownerUserA, FX.ownerUserB]);
    assert.strictEqual(
      after?.length ?? 0,
      countBefore,
      "Le nombre de virements ne doit pas avoir augmenté"
    );
  });
});

// ─── Suite 3 : retry_failed_cron_jobs() ──────────────────────────────────────
describe("retry_failed_cron_jobs()", { skip }, () => {
  let failedLogId: number;
  let exhaustedLogId: number;

  before(async () => {
    await cleanupCronFixtures();

    // Log en échec, retryable (retry_count=1 < max_retries=3)
    const { data: l1, error: e1 } = await db
      .from("admin_cron_logs")
      .insert({
        job_name:    "expire-campaigns-nightly",
        result:      { success: false, error: "simulated failure" },
        status:      "failed",
        retry_count: 1,
        max_retries: 3,
        executed_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      })
      .select("id")
      .single();
    if (e1) throw new Error(`Setup failedLog: ${e1.message}`);
    failedLogId = l1!.id;

    // Log en échec, plafond atteint (retry_count=3 = max_retries=3)
    const { data: l2, error: e2 } = await db
      .from("admin_cron_logs")
      .insert({
        job_name:    "expire-campaigns-nightly",
        result:      { success: false, error: "max retries reached" },
        status:      "failed",
        retry_count: 3,
        max_retries: 3,
        executed_at: new Date(Date.now() - 120_000).toISOString(),
      })
      .select("id")
      .single();
    if (e2) throw new Error(`Setup exhaustedLog: ${e2.message}`);
    exhaustedLogId = l2!.id;
  });

  after(async () => {
    await db.from("admin_cron_logs").delete().like("job_name", "expire-campaigns-nightly");
  });

  it("incrémentation de retry_count — nouvelle entrée avec retry_count+1", async () => {
    const { data, error } = await db.rpc("retry_failed_cron_jobs");

    assert.ifError(error);
    assert.strictEqual(data.success, true);
    // Au moins 1 job relancé (l'entrée retryable)
    assert.ok(data.retried >= 1, `Au moins 1 relance attendue, reçu : ${data.retried}`);

    // Vérifier qu'une nouvelle entrée a été créée avec retry_count=2
    const { data: retryEntry } = await db
      .from("admin_cron_logs")
      .select("retry_count, parent_log_id, status")
      .eq("parent_log_id", failedLogId)
      .single();

    assert.ok(retryEntry, "Une entrée de relance doit exister");
    assert.strictEqual(
      retryEntry!.retry_count,
      2,
      `retry_count doit être 2 (1+1), reçu : ${retryEntry!.retry_count}`
    );
    assert.strictEqual(
      retryEntry!.parent_log_id,
      failedLogId,
      "parent_log_id doit pointer vers l'entrée originale"
    );
  });

  it("plafond max_retries — arrêt au seuil, pas de nouvelle entrée", async () => {
    // L'entrée exhaustedLogId a retry_count=3=max_retries → ne doit PAS être relancée
    const { data: before } = await db
      .from("admin_cron_logs")
      .select("id")
      .eq("parent_log_id", exhaustedLogId);
    const countBefore = before?.length ?? 0;

    // La relance a déjà tourné dans le test précédent
    // On relance encore une fois pour confirmer que le plafond tient
    const { data, error } = await db.rpc("retry_failed_cron_jobs");
    assert.ifError(error);

    const { data: after } = await db
      .from("admin_cron_logs")
      .select("id")
      .eq("parent_log_id", exhaustedLogId);
    assert.strictEqual(
      after?.length ?? 0,
      countBefore,
      "Aucune nouvelle relance ne doit avoir été créée pour un job au plafond"
    );
  });

  it("jobs non reconnus — statut failed maintenu (pas de boucle infinie)", async () => {
    // Insertion d'un job inconnu en échec
    const { data: unknownLog } = await db
      .from("admin_cron_logs")
      .insert({
        job_name:    "unknown-job-integration-test",
        result:      { success: false },
        status:      "failed",
        retry_count: 0,
        max_retries: 3,
        executed_at: new Date(Date.now() - 30_000).toISOString(),
      })
      .select("id")
      .single();

    const { data, error } = await db.rpc("retry_failed_cron_jobs");
    assert.ifError(error);

    // Le job inconnu doit rester 'failed' (ou 'retrying' si la fonction le marque)
    const { data: logAfter } = await db
      .from("admin_cron_logs")
      .select("status")
      .eq("id", unknownLog!.id)
      .single();

    // La fonction met les jobs inconnus à 'failed' (CONTINUE)
    assert.ok(
      logAfter!.status === "failed" || logAfter!.status === "retrying",
      `Le job inconnu doit rester 'failed' ou 'retrying', reçu : ${logAfter!.status}`
    );

    // Cleanup
    await db.from("admin_cron_logs").delete().eq("id", unknownLog!.id);
  });
});
