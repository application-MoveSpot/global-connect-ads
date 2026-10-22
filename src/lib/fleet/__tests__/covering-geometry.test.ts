import { test } from "node:test";
import assert from "node:assert/strict";
import { coveringProjection, isCoveringQuad, normalizeCoveringQuad, parseCoveringZone, zoneForPhoto, type CoveringQuad } from "../covering-geometry.ts";

const quad: CoveringQuad = [
  { x: 0.2, y: 0.35 }, { x: 0.7, y: 0.42 },
  { x: 0.65, y: 0.65 }, { x: 0.22, y: 0.7 },
];

test("normalized four corners project exactly onto the owner-defined polygon", () => {
  const result = coveringProjection(quad, 800, 450);
  assert.ok(result);
  const source = [[0, 0], [result.width, 0], [result.width, result.height], [0, result.height]];
  source.forEach(([x, y], i) => {
    assert.ok(x !== undefined && y !== undefined);
    const point = quad[i];
    assert.ok(point);
    const projected = result.projection.transform(x, y);
    assert.ok(Math.abs(projected[0] - point.x * 800) < 0.01);
    assert.ok(Math.abs(projected[1] - point.y * 450) < 0.01);
  });
});

test("perspective stays normalized when the photo frame changes size", () => {
  const small = coveringProjection(quad, 320, 180);
  const large = coveringProjection(quad, 960, 540);
  assert.ok(small && large);
  const a = small.projection.transform(small.width / 2, small.height / 2);
  const b = large.projection.transform(large.width / 2, large.height / 2);
  assert.ok(Math.abs(a[0] / 320 - b[0] / 960) < 0.00001);
  assert.ok(Math.abs(a[1] / 180 - b[1] / 540) < 0.00001);
});

test("rejects crossed, degenerate, nonfinite and out-of-range zones", () => {
  assert.equal(isCoveringQuad([quad[0], quad[2], quad[1], quad[3]]), false);
  assert.equal(isCoveringQuad([quad[0], quad[0], quad[0], quad[0]]), false);
  assert.equal(isCoveringQuad([{ x: NaN, y: 0.3 }, ...quad.slice(1)]), false);
  assert.equal(isCoveringQuad([{ x: -0.1, y: 0.3 }, ...quad.slice(1)]), false);
  assert.equal(coveringProjection(quad, 0, 0), null);
});

test("JSON parsing tolerates corrupt entries without losing valid photo zones", () => {
  assert.deepEqual(parseCoveringZone({ 0: { points: quad }, 1: { points: [] } }), { 0: { points: quad } });
  assert.equal(parseCoveringZone({ 0: { points: "invalid" } }), null);
});

test("a zone is not applied to a different photo after reordering", () => {
  const zone = { 0: { points: quad, photoPath: "owner/side.jpg" } };
  assert.equal(zoneForPhoto(zone, 0, "owner/front.jpg"), null);
  assert.deepEqual(zoneForPhoto(zone, 0, "owner/side.jpg"), zone[0]);
  assert.deepEqual(zoneForPhoto({ 0: { points: quad } }, 0, "legacy.jpg"), { points: quad });
});

test("door corners selected counterclockwise save in clockwise order", () => {
  assert.deepEqual(normalizeCoveringQuad([quad[0], quad[3], quad[2], quad[1]]), quad);
});

test("normalizing winding still rejects crossed door corners", () => {
  assert.equal(normalizeCoveringQuad([quad[0], quad[2], quad[1], quad[3]]), null);
});