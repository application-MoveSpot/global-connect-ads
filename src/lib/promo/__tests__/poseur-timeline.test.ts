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

test("le film Poseurs dure 35 s en 4 séquences : 0–6, 6–16, 16–27, 27–35", () => {
  assert.equal(POSEUR_DURATION, 35);
  assert.deepEqual(
    POSEUR_SEQUENCES.map((s) => [s.start, s.end]),
    [[0, 6], [6, 16], [16, 27], [27, 35]],
  );
  assert.equal(poseurSequenceAt(5.9), "accroche");
  assert.equal(poseurSequenceAt(6), "mise-en-relation");
  assert.equal(poseurSequenceAt(26.9), "validation");
  assert.equal(poseurSequenceAt(35), "inscription");
});

test("les sous-titres couvrent tout le film sans trou ni chevauchement", () => {
  let cursor = 0;
  for (const c of POSEUR_CAPTIONS) {
    assert.equal(c.start, cursor);
    assert.ok(c.end > c.start);
    cursor = c.end;
  }
  assert.equal(cursor, POSEUR_DURATION);
  assert.match(poseurCaptionAt(21), /4 photos/);
  assert.match(poseurCaptionAt(25), /Stripe Connect \(RC Pro vérifiée\)/);
});

test("la validation de pose repose sur 4 photos", () => {
  assert.equal(POSEUR_PHOTOS.length, 4);
});
