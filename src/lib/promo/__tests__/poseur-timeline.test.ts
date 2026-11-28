import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  POSEUR_CAPTIONS,
  POSEUR_DURATION,
  POSEUR_PHOTOS,
  POSEUR_SEQUENCES,
  poseurCaptionAt,
  poseurSequenceAt,
} from "../poseur-timeline.ts";
import { PROVIDER_PLANS, PROVIDER_TRIAL_DAYS } from "../../providers/provider-plans.ts";

test("le film Poseurs dure 35 s en 4 séquences : 0–7, 7–16, 16–27, 27–35", () => {
  assert.equal(POSEUR_DURATION, 35);
  assert.deepEqual(
    POSEUR_SEQUENCES.map((s) => [s.start, s.end]),
    [[0, 7], [7, 16], [16, 27], [27, 35]],
  );
  assert.equal(poseurSequenceAt(6.9), "accroche");
  assert.equal(poseurSequenceAt(7), "missions");
  assert.equal(poseurSequenceAt(26.9), "validation");
  assert.equal(poseurSequenceAt(35), "paiement");
});

test("les sous-titres couvrent tout le film sans trou ni chevauchement", () => {
  let cursor = 0;
  for (const c of POSEUR_CAPTIONS) {
    assert.equal(c.start, cursor);
    assert.ok(c.end > c.start);
    cursor = c.end;
  }
  assert.equal(cursor, POSEUR_DURATION);
  assert.match(poseurCaptionAt(22), /4 photos \(avant, arrière, profil gauche et droit\)/);
  assert.match(poseurCaptionAt(25), /48h ouvrées/);
  assert.match(poseurCaptionAt(30), /Stripe Connect/);
});

test("la validation de pose repose sur 4 photos : avant, arrière, profil gauche, profil droit", () => {
  assert.deepEqual([...POSEUR_PHOTOS], ["Avant", "Arrière", "Profil gauche", "Profil droit"]);
});

test("le film ne mentionne jamais les vitres teintées", () => {
  for (const c of POSEUR_CAPTIONS) assert.doesNotMatch(c.text, /vitres? teintées?/i);
});

test("l'essai et les prix annoncés sont ceux des plans prestataires", () => {
  const offer = poseurCaptionAt(5);
  assert.ok(offer.includes(`${PROVIDER_TRIAL_DAYS} jours d'essai gratuit`));
  for (const plan of PROVIDER_PLANS) assert.ok(offer.includes(`${plan.amountEur} €`));
});
