import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateZoneBudget,
  findDenseMetro,
  RATE_EUR_PER_KM2_PER_DAY,
  MIN_EUR_PER_DAY,
  DENSE_ZONE_MULTIPLIER,
  type LngLat,
} from "../zone-budget.ts";

// Polygone autour de la Tour Eiffel (Paris dense)
const PARIS_POLYGON: LngLat[] = [
  [2.29, 48.86],
  [2.31, 48.86],
  [2.31, 48.84],
  [2.29, 48.84],
];

// Polygone rural en Bretagne (hors metro dense)
const RURAL_POLYGON: LngLat[] = [
  [-2.5, 48.0],
  [-2.4, 48.0],
  [-2.4, 47.9],
  [-2.5, 47.9],
];

describe("findDenseMetro", () => {
  it("reconnaît Paris", () => {
    assert.equal(findDenseMetro(PARIS_POLYGON)?.name, "Paris");
  });

  it("ne reconnaît pas une zone rurale bretonne", () => {
    assert.equal(findDenseMetro(RURAL_POLYGON), null);
  });

  it("retourne null pour un polygone vide", () => {
    assert.equal(findDenseMetro([]), null);
  });

  it("retourne null pour null", () => {
    assert.equal(findDenseMetro(null), null);
  });

  it("retourne null pour un polygone à 2 points (< 3)", () => {
    assert.equal(
      findDenseMetro([
        [2.3, 48.85],
        [2.31, 48.86],
      ]),
      null,
    );
  });

  it("reconnaît Lyon", () => {
    const lyon: LngLat[] = [
      [4.8, 45.75],
      [4.82, 45.75],
      [4.82, 45.73],
      [4.8, 45.73],
    ];
    assert.equal(findDenseMetro(lyon)?.name, "Lyon");
  });
});

describe("estimateZoneBudget — plancher journalier", () => {
  it("respecte le plancher MIN_EUR_PER_DAY pour une petite zone", () => {
    const result = estimateZoneBudget(0.001, 1, 1);
    assert.equal(result.total, MIN_EUR_PER_DAY);
    assert.equal(result.perDay, MIN_EUR_PER_DAY);
  });

  it("multiplicateur absent en zone rurale (multiplier = 1)", () => {
    const result = estimateZoneBudget(100, 1, 1, RURAL_POLYGON);
    assert.equal(result.multiplier, 1);
    assert.equal(result.denseMetro, null);
  });
});

describe("estimateZoneBudget — zone dense (Paris)", () => {
  it("applique le multiplicateur DENSE_ZONE_MULTIPLIER", () => {
    const result = estimateZoneBudget(50, 5, 2, PARIS_POLYGON);
    assert.equal(result.multiplier, DENSE_ZONE_MULTIPLIER);
    assert.equal(result.denseMetro, "Paris");

    const expectedRate = RATE_EUR_PER_KM2_PER_DAY * DENSE_ZONE_MULTIPLIER;
    const expectedTotal = Math.round(50 * expectedRate * 5 * 2);
    assert.equal(result.total, expectedTotal);
  });

  it("ratePerKm2PerDay est arrondi à 2 décimales", () => {
    const result = estimateZoneBudget(10, 1, 1, PARIS_POLYGON);
    assert.equal(
      result.ratePerKm2PerDay,
      Math.round(RATE_EUR_PER_KM2_PER_DAY * DENSE_ZONE_MULTIPLIER * 100) / 100,
    );
  });
});

describe("estimateZoneBudget — véhicules et jours", () => {
  it("scale linéairement avec le nombre de véhicules", () => {
    const one = estimateZoneBudget(50, 7, 1);
    const three = estimateZoneBudget(50, 7, 3);
    assert.equal(three.total, one.total * 3);
  });

  it("scale linéairement avec le nombre de jours", () => {
    const d1 = estimateZoneBudget(50, 1, 2);
    const d5 = estimateZoneBudget(50, 5, 2);
    assert.equal(d5.total, d1.total * 5);
  });

  it("jours minimum = 1 si days=0", () => {
    assert.equal(estimateZoneBudget(50, 0, 1).days, 1);
  });

  it("véhicules minimum = 1 si vehicles=0", () => {
    assert.equal(estimateZoneBudget(50, 3, 0).vehicles, 1);
  });
});

describe("estimateZoneBudget — structure de retour", () => {
  it("retourne tous les champs requis", () => {
    const result = estimateZoneBudget(30, 14, 5, PARIS_POLYGON);
    assert.equal(typeof result.total, "number");
    assert.equal(typeof result.perDay, "number");
    assert.equal(result.areaKm2, 30);
    assert.equal(result.days, 14);
    assert.equal(result.vehicles, 5);
    assert.equal(result.multiplier, DENSE_ZONE_MULTIPLIER);
    assert.equal(typeof result.ratePerKm2PerDay, "number");
    assert.equal(result.denseMetro, "Paris");
  });
});
