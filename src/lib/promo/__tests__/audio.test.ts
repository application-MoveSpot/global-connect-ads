import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ShortAudio } from "../audio.ts";
import { NARRATION_WORDS } from "../narration-cues.ts";
import { captionAt } from "../timeline.ts";

test("aligned narration stays inside the 45 second Short", () => {
  assert.ok(NARRATION_WORDS.length > 0);
  for (const cue of NARRATION_WORDS) {
    assert.ok(cue.start >= 0 && cue.end <= 45);
    assert.ok(cue.end > cue.start);
  }
});
test("caption highlight follows each measured spoken-word start", () => {
  for (const cue of NARRATION_WORDS) {
    const caption = captionAt(cue.start);
    assert.equal(caption.words[caption.active], cue.word);
  }
});
test("audio clock pauses, seeks and supplies an audio track to the recorder", () => {
  let stopped = 0;
  const connections: unknown[] = [];
  const track = { kind: "audio", stop: () => { stopped++; } };
  const context = {
    currentTime: 10,
    destination: {},
    createGain: () => ({ connect: (target: unknown) => connections.push(target), disconnect: () => {} }),
    createBufferSource: () => ({ buffer: null, connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {} }),
    createMediaStreamDestination: () => ({ stream: { getTracks: () => [track], getAudioTracks: () => [track] } }),
  };
  const sound = new ShortAudio(context as unknown as AudioContext, {} as AudioBuffer);
  sound.play(8); context.currentTime = 12;
  assert.equal(sound.time(), 10);
  sound.pause(); context.currentTime = 13;
  assert.equal(sound.time(), 10);
  sound.play(37); context.currentTime = 21;
  assert.equal(sound.time(), 45);
  const capture = sound.capture();
  assert.equal(capture.stream.getAudioTracks()[0]?.kind, "audio");
  assert.equal(connections.length, 2);
  capture.release(); capture.release();
  assert.equal(stopped, 1);
});