import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDER_PLANS, PROVIDER_TRIAL_DAYS } from "../provider-plans.ts";

test("les plans prestataires sont 29 €, 42 € et 59 € par mois", () => {
  assert.deepEqual(
    PROVIDER_PLANS.map((p) => p.amountEur),
    [29, 42, 59],
  );
});

test("l'essai gratuit prestataire dure 14 jours", () => {
  assert.equal(PROVIDER_TRIAL_DAYS, 14);
});
