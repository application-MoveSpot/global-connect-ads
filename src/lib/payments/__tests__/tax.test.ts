import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { determineTaxBehavior, applyTax, type TaxDecision } from "../tax.ts";

describe("determineTaxBehavior — DOM (8,5 %)", () => {
  it("Guadeloupe (971) → TVA 8,5 %", () => {
    const d = determineTaxBehavior("FR", "97100");
    assert.equal(d.rate, 8.5);
    assert.equal(d.exempt, "none");
    assert.equal(d.tax_behavior, "exclusive");
    assert.ok(/DOM/i.test(d.description));
  });

  it("Martinique (972) → TVA 8,5 %", () => {
    assert.equal(determineTaxBehavior("FR", "97200").rate, 8.5);
  });

  it("La Réunion (974) → TVA 8,5 %", () => {
    assert.equal(determineTaxBehavior("FR", "97400").rate, 8.5);
  });

  it("Mayotte (976) n'est PAS dans la liste DOM → exonération art. 259 B", () => {
    assert.equal(determineTaxBehavior("FR", "97600").rate, 0);
  });
});

describe("determineTaxBehavior — France métropolitaine", () => {
  it("Paris (75001) → exonération art. 259 B, rate = 0", () => {
    const d = determineTaxBehavior("FR", "75001");
    assert.equal(d.rate, 0);
    assert.equal(d.exempt, "reverse");
    assert.ok(/259 B/.test(d.invoiceMention));
  });

  it("Lyon (69001) → exonération art. 259 B", () => {
    const d = determineTaxBehavior("FR", "69001");
    assert.equal(d.rate, 0);
    assert.equal(d.exempt, "reverse");
  });

  it("code postal avec espaces est normalisé", () => {
    assert.equal(determineTaxBehavior("FR", "75 001").rate, 0);
  });

  it("country en minuscules est normalisé", () => {
    assert.equal(determineTaxBehavior("fr", "75001").rate, 0);
  });
});

describe("determineTaxBehavior — Union Européenne (hors France)", () => {
  const EU_COUNTRIES = ["DE", "IT", "ES", "BE", "NL", "PT", "PL", "RO"];

  for (const country of EU_COUNTRIES) {
    it(`${country} → autoliquidation UE, rate = 0`, () => {
      const d = determineTaxBehavior(country, "");
      assert.equal(d.rate, 0);
      assert.equal(d.exempt, "reverse");
      assert.ok(/196/.test(d.invoiceMention));
    });
  }

  it("UK (post-Brexit) n'est PAS UE → exonération art. 259 B", () => {
    const d = determineTaxBehavior("GB", "");
    assert.equal(d.rate, 0);
    assert.ok(/259 B/.test(d.invoiceMention));
  });
});

describe("determineTaxBehavior — reste du monde", () => {
  it("USA → exonération art. 259 B", () => {
    const d = determineTaxBehavior("US", "");
    assert.equal(d.rate, 0);
    assert.equal(d.exempt, "reverse");
    assert.ok(/259 B/.test(d.invoiceMention));
  });

  it("Japon → exonération art. 259 B", () => {
    assert.equal(determineTaxBehavior("JP", "").rate, 0);
  });

  it("country vide → exonération art. 259 B (fallback sécurisé)", () => {
    const d = determineTaxBehavior("", "");
    assert.equal(d.rate, 0);
    assert.equal(d.exempt, "reverse");
  });
});

describe("applyTax", () => {
  it("taux 8,5 % sur 10 000 cts → 10 850 cts", () => {
    const decision: TaxDecision = {
      tax_behavior: "exclusive",
      exempt: "none",
      description: "",
      invoiceMention: "",
      rate: 8.5,
    };
    assert.equal(applyTax(10_000, decision), 10_850);
  });

  it("taux 0 % → montant inchangé", () => {
    const decision: TaxDecision = {
      tax_behavior: "unspecified",
      exempt: "reverse",
      description: "",
      invoiceMention: "",
      rate: 0,
    };
    assert.equal(applyTax(5_000, decision), 5_000);
  });

  it("arrondi au centime inférieur sur fraction < 0,5", () => {
    const decision: TaxDecision = {
      tax_behavior: "exclusive",
      exempt: "none",
      description: "",
      invoiceMention: "",
      rate: 8.5,
    };
    // 1 ct * 1.085 = 1.085 → arrondi à 1
    assert.equal(applyTax(1, decision), 1);
  });

  it("montant 0 reste 0", () => {
    const decision: TaxDecision = {
      tax_behavior: "exclusive",
      exempt: "none",
      description: "",
      invoiceMention: "",
      rate: 8.5,
    };
    assert.equal(applyTax(0, decision), 0);
  });
});
