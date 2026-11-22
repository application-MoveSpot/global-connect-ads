/**
 * Tests unitaires — Barèmes vinyle (CGV Art. 2 / CGU Art. 11bis & Art. 25)
 *
 * Couvre :
 *   1. getVinylTier           — mapping format → tier
 *   2. computeSetupFeeCents   — forfait mise en service (< 15 jours vs ≥ 15 jours)
 *   3. computeIncidentChargeCents — refacturation incident ± supplément déplacement
 *   4. Constantes de référence CGV (valeurs nominales)
 *
 * Aucun accès réseau, aucune variable d'environnement requise.
 * Usage : npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getVinylTier,
  computeSetupFeeCents,
  computeIncidentChargeCents,
  SETUP_FEE_HT_CENTS,
  INCIDENT_CHARGE_TTC_CENTS,
  TRAVEL_SUPPLEMENT_TTC_CENTS,
} from "../setup-fee.ts";

// ─── 1. getVinylTier ──────────────────────────────────────────────────────────

describe("getVinylTier", () => {
  it("covering_total → complet", () => {
    assert.equal(getVinylTier("covering_total"), "complet");
  });
  it("demi_covering → double", () => {
    assert.equal(getVinylTier("demi_covering"), "double");
  });
  it("stickers → simple", () => {
    assert.equal(getVinylTier("stickers"), "simple");
  });
  it("affiche → simple", () => {
    assert.equal(getVinylTier("affiche"), "simple");
  });
  it("boxled → simple", () => {
    assert.equal(getVinylTier("boxled"), "simple");
  });
  it("null → simple (fallback sécurisé)", () => {
    assert.equal(getVinylTier(null), "simple");
  });
  it("undefined → simple (fallback sécurisé)", () => {
    assert.equal(getVinylTier(undefined), "simple");
  });
  it("chaîne inconnue → simple (fallback sécurisé)", () => {
    assert.equal(getVinylTier("format_inconnu"), "simple");
  });
});

// ─── 2. computeSetupFeeCents ─────────────────────────────────────────────────

describe("computeSetupFeeCents — forfait mise en service", () => {
  describe("campagne ≥ 15 jours → offert (0 €)", () => {
    const formats = ["covering_total", "demi_covering", "stickers", "affiche", "boxled"];
    for (const f of formats) {
      it(`${f} × 15 jours → 0 (frontière, CGV Art. 2)`, () => {
        assert.equal(computeSetupFeeCents(f, 15), 0);
      });
      it(`${f} × 30 jours → 0`, () => {
        assert.equal(computeSetupFeeCents(f, 30), 0);
      });
    }
    it("daysCount null → 0 (défaut sécurisé)", () => {
      assert.equal(computeSetupFeeCents("stickers", null), 0);
    });
    it("daysCount undefined → 0", () => {
      assert.equal(computeSetupFeeCents("stickers", undefined), 0);
    });
    it("daysCount 0 → 0", () => {
      assert.equal(computeSetupFeeCents("stickers", 0), 0);
    });
  });

  describe("campagne < 15 jours → forfait facturé (CGV Art. 2)", () => {
    it("covering_total (complet) × 7 j → 9 900 centimes (99,00 € HT)", () => {
      assert.equal(computeSetupFeeCents("covering_total", 7), 9_900);
    });
    it("demi_covering (double) × 7 j → 7 900 centimes (79,00 € HT)", () => {
      assert.equal(computeSetupFeeCents("demi_covering", 7), 7_900);
    });
    it("stickers (simple) × 7 j → 5 900 centimes (59,00 € HT)", () => {
      assert.equal(computeSetupFeeCents("stickers", 7), 5_900);
    });
    it("affiche (simple) × 7 j → 5 900 centimes (59,00 € HT)", () => {
      assert.equal(computeSetupFeeCents("affiche", 7), 5_900);
    });
    it("boxled (simple) × 1 j → 5 900 centimes (59,00 € HT)", () => {
      assert.equal(computeSetupFeeCents("boxled", 1), 5_900);
    });
    it("format null (simple) × 7 j → 5 900 centimes (fallback)", () => {
      assert.equal(computeSetupFeeCents(null, 7), 5_900);
    });
    it("frontière 14 jours → facturé (< 15)", () => {
      assert.equal(computeSetupFeeCents("stickers", 14), 5_900);
    });
    it("frontière 1 jour → facturé", () => {
      assert.equal(computeSetupFeeCents("covering_total", 1), 9_900);
    });
  });
});

// ─── 3. computeIncidentChargeCents ───────────────────────────────────────────

describe("computeIncidentChargeCents — refacturation incident (CGU Art. 25)", () => {
  describe("sans déplacement (atelier, withTravel = false)", () => {
    it("covering_total → 8 900 centimes (89,00 € TTC)", () => {
      assert.equal(computeIncidentChargeCents("covering_total", false), 8_900);
    });
    it("demi_covering → 6 900 centimes (69,00 € TTC)", () => {
      assert.equal(computeIncidentChargeCents("demi_covering", false), 6_900);
    });
    it("stickers → 4 900 centimes (49,00 € TTC)", () => {
      assert.equal(computeIncidentChargeCents("stickers", false), 4_900);
    });
    it("affiche → 4 900 centimes (49,00 € TTC)", () => {
      assert.equal(computeIncidentChargeCents("affiche", false), 4_900);
    });
    it("boxled → 4 900 centimes (49,00 € TTC)", () => {
      assert.equal(computeIncidentChargeCents("boxled", false), 4_900);
    });
    it("null format → 4 900 centimes (fallback simple)", () => {
      assert.equal(computeIncidentChargeCents(null, false), 4_900);
    });
  });

  describe("avec déplacement (+35,00 € TTC — CGU Art. 11bis)", () => {
    it("covering_total + travel → 8 900 + 3 500 = 12 400 centimes", () => {
      assert.equal(computeIncidentChargeCents("covering_total", true), 12_400);
    });
    it("demi_covering + travel → 6 900 + 3 500 = 10 400 centimes", () => {
      assert.equal(computeIncidentChargeCents("demi_covering", true), 10_400);
    });
    it("stickers + travel → 4 900 + 3 500 = 8 400 centimes", () => {
      assert.equal(computeIncidentChargeCents("stickers", true), 8_400);
    });
    it("null format + travel → 4 900 + 3 500 = 8 400 centimes (fallback simple)", () => {
      assert.equal(computeIncidentChargeCents(null, true), 8_400);
    });
  });

  describe("symétrie withTravel = true vs false", () => {
    for (const f of ["covering_total", "demi_covering", "stickers"]) {
      it(`${f} : diff withTravel = TRAVEL_SUPPLEMENT_TTC_CENTS`, () => {
        const withT = computeIncidentChargeCents(f, true);
        const withoutT = computeIncidentChargeCents(f, false);
        assert.equal(withT - withoutT, TRAVEL_SUPPLEMENT_TTC_CENTS);
      });
    }
  });
});

// ─── 4. Constantes de référence (CGV Art. 2 / CGU Art. 11bis & 25) ───────────

describe("Constantes barème — valeurs nominales CGV/CGU", () => {
  it("TRAVEL_SUPPLEMENT_TTC_CENTS = 3 500 (35,00 € TTC)", () => {
    assert.equal(TRAVEL_SUPPLEMENT_TTC_CENTS, 3_500);
  });
  it("SETUP_FEE_HT_CENTS.simple = 5 900 (59,00 € HT)", () => {
    assert.equal(SETUP_FEE_HT_CENTS.simple, 5_900);
  });
  it("SETUP_FEE_HT_CENTS.double = 7 900 (79,00 € HT)", () => {
    assert.equal(SETUP_FEE_HT_CENTS.double, 7_900);
  });
  it("SETUP_FEE_HT_CENTS.complet = 9 900 (99,00 € HT)", () => {
    assert.equal(SETUP_FEE_HT_CENTS.complet, 9_900);
  });
  it("INCIDENT_CHARGE_TTC_CENTS.simple = 4 900 (49,00 € TTC)", () => {
    assert.equal(INCIDENT_CHARGE_TTC_CENTS.simple, 4_900);
  });
  it("INCIDENT_CHARGE_TTC_CENTS.double = 6 900 (69,00 € TTC)", () => {
    assert.equal(INCIDENT_CHARGE_TTC_CENTS.double, 6_900);
  });
  it("INCIDENT_CHARGE_TTC_CENTS.complet = 8 900 (89,00 € TTC)", () => {
    assert.equal(INCIDENT_CHARGE_TTC_CENTS.complet, 8_900);
  });
  it("barèmes croissants : simple < double < complet (setup fee)", () => {
    assert.ok(SETUP_FEE_HT_CENTS.simple < SETUP_FEE_HT_CENTS.double);
    assert.ok(SETUP_FEE_HT_CENTS.double < SETUP_FEE_HT_CENTS.complet);
  });
  it("barèmes croissants : simple < double < complet (incident)", () => {
    assert.ok(INCIDENT_CHARGE_TTC_CENTS.simple < INCIDENT_CHARGE_TTC_CENTS.double);
    assert.ok(INCIDENT_CHARGE_TTC_CENTS.double < INCIDENT_CHARGE_TTC_CENTS.complet);
  });
});

// ─── 5. Sécurité — aucune clé secrète en dur ─────────────────────────────────

describe("Sécurité — absence de clés secrètes Stripe en dur", () => {
  // Patterns fractionnés pour ne pas se déclencher sur leurs propres occurrences.
  const SK_TEST = "sk" + "_test_";
  const SK_LIVE = "sk" + "_live_";

  const FILES_TO_CHECK = [
    { label: "setup-fee.ts", rel: "../setup-fee.ts" },
    { label: "campaign-settlement.server.ts", rel: "../../campaigns/campaign-settlement.server.ts" },
    { label: "incident.functions.ts", rel: "../../tracking/incident.functions.ts" },
  ];

  for (const f of FILES_TO_CHECK) {
    it(`${f.label} — pas de clé secrète Stripe en dur`, async () => {
      const { readFileSync } = await import("node:fs");
      const { join, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const dir = dirname(fileURLToPath(import.meta.url));
      const src = readFileSync(join(dir, f.rel), "utf8");
      assert.ok(!src.includes(SK_TEST), `Clé Stripe test trouvée en dur dans ${f.label}`);
      assert.ok(!src.includes(SK_LIVE), `Clé Stripe live trouvée en dur dans ${f.label}`);
    });
  }
});
