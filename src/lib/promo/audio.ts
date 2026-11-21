import { DURATION } from "./timeline";

/** One audio clock drives both the rendered frame and the captured audio. */
export class ShortAudio {
  private sources: AudioBufferSourceNode[] = [];
  private started = 0;
  private offset = 0;
  private running = false;
  private master: GainNode;

  constructor(readonly context: AudioContext, private voice: AudioBuffer) {
    this.master = context.createGain();
    this.master.connect(context.destination);
  }
  async resume() { await this.context.resume(); }
  time = () => Math.min(DURATION, this.offset + (this.running ? this.context.currentTime - this.started : 0));
  pause() {
    this.offset = this.time(); this.running = false;
    this.sources.forEach((source) => { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); });
    this.sources = [];
  }
  play(offset: number) {
    this.pause(); this.offset = offset; this.started = this.context.currentTime; this.running = true;
    const voice = this.context.createBufferSource(); voice.buffer = this.voice;
    voice.connect(this.master); voice.start(this.started, offset);
    this.sources.push(voice);
  }
  capture() {
    const destination = this.context.createMediaStreamDestination(); this.master.connect(destination);
    let released = false;
    return { stream: destination.stream, release: () => {
      if (released) return;
      released = true; this.master.disconnect(destination); destination.stream.getTracks().forEach((t) => t.stop());
    } };
  }
  dispose() { this.pause(); this.master.disconnect(); void this.context.close(); }
}