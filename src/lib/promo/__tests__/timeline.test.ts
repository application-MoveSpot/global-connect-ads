import { test } from "node:test";
import { strict as assert } from "node:assert";
import { DURATION, WIDTH, HEIGHT, SHOTS, captionAt, shotAt, recorderFormat, OWNER_TERMS, OWNER_MONTHLY_EUR } from "../timeline.ts";

test("owner minimum is 17.50 euros per day and 385 euros for 22 days", () => {
  assert.equal(OWNER_TERMS.minimumDailyEur, 17.5);
  assert.equal(OWNER_TERMS.daysPerMonth, 22);
  assert.equal(OWNER_MONTHLY_EUR, 385);
});
test("owner minimum represents 70 percent of the 25 euro advertiser rate", () => {
  assert.equal(OWNER_TERMS.advertiserShare, 0.7);
  assert.equal(25 * OWNER_TERMS.advertiserShare, OWNER_TERMS.minimumDailyEur);
});
test("dense-zone monthly revenue reaches 514.50 euros", () => {
  assert.equal(OWNER_TERMS.denseZoneMonthlyEur, 514.5);
});
test("validation window is 48 hours", () => {
  assert.equal(OWNER_TERMS.validationHours, 48);
});

test("the Short lasts exactly 45 seconds with contiguous scenes", () => {
  assert.equal(DURATION, 45);
  assert.equal(SHOTS[0].start, 0);
  assert.equal(SHOTS[SHOTS.length - 1].end, 45);
  SHOTS.slice(1).forEach((shot, i) => assert.equal(shot.start, SHOTS[i].end));
  assert.equal(shotAt(8).start, 8);
  assert.equal(shotAt(37).start, 37);
});
test("export dimensions are 1080 by 1920", () => {
  assert.equal(WIDTH, 1080);
  assert.equal(HEIGHT, 1920);
  assert.equal(WIDTH / HEIGHT, 9 / 16);
});
test("dynamic captions never exceed four words", () => {
  for (let t = 0; t < 45; t += .05) {
    const c = captionAt(t);
    assert.ok(c.words.length <= 4);
    assert.ok(c.active >= 0 && c.active < c.words.length);
  }
});
test("export never labels WebM as MP4", () => {
  assert.equal(recorderFormat((m) => m === "video/webm")?.extension, "webm");
  assert.equal(recorderFormat((m) => m === "video/mp4")?.extension, "mp4");
  assert.equal(recorderFormat(() => false), null);
});