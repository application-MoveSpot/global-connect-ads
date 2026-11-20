import { test } from "node:test";
import { strict as assert } from "node:assert";
import { DURATION, WIDTH, HEIGHT, SHOTS, captionAt, shotAt, recorderFormat } from "../timeline.ts";

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