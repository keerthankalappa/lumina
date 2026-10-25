/**
 * Procedural ambient soundscapes built with the Web Audio API — no audio files to host or license.
 * Every soundscape feeds one master gain and an analyser that drives the waveform visualisers.
 */
export type SoundscapeId = "morning-mist" | "singing-bowls" | "temple-chimes" | "pine-forest-rain" | "binaural-432";

export const SOUNDSCAPES: Array<{ id: SoundscapeId; name: string; icon: string; blurb: string }> = [
  { id: "morning-mist", name: "Morning Mist", icon: "air", blurb: "Soft wind and a warm 432Hz pad" },
  { id: "singing-bowls", name: "Singing Bowls", icon: "self_improvement", blurb: "Slow, resonant bowl strikes" },
  { id: "temple-chimes", name: "Temple Chimes", icon: "notifications_active", blurb: "Sparse pentatonic chimes" },
  { id: "pine-forest-rain", name: "Pine Forest Rain", icon: "forest", blurb: "Gentle rain under the canopy" },
  { id: "binaural-432", name: "Binaural 432Hz", icon: "headphones", blurb: "8Hz alpha beat — use headphones" },
];

type Layer = { stop: () => void };

function noiseBuffer(ctx: AudioContext, kind: "white" | "brown" | "pink", seconds = 4): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") data[i] = white;
      else if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
      }
    }
  }
  return buffer;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bus: GainNode | null = null;
  private layers: Layer[] = [];
  private timers: number[] = [];
  private volume = 0.65;
  current: SoundscapeId | null = null;

  private ensure() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, master: this.master!, analyser: this.analyser! };
  }

  getAnalyser() {
    return this.analyser;
  }

  get playing() {
    return this.current !== null;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && this.current) this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx.currentTime, 0.2);
  }

  /** Must be called from a user gesture the first time (browser autoplay policy). */
  async start(id: SoundscapeId) {
    const { ctx, master } = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    if (this.current === id) return;
    this.bus?.gain.setTargetAtTime(0, ctx.currentTime, 0.3); // crossfade out the previous soundscape
    this.clearLayers(1.5);
    this.current = id;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    bus.connect(master);
    this.bus = bus;
    this.build(id, ctx, bus);
    this.layers.push({ stop: () => bus.disconnect() });
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(this.volume * 0.5, ctx.currentTime, 0.8);
  }

  stop() {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    this.clearLayers(2.5);
    this.current = null;
  }

  private clearLayers(afterSeconds: number) {
    const old = this.layers;
    const timers = this.timers;
    this.layers = [];
    this.timers = [];
    timers.forEach((t) => clearTimeout(t));
    setTimeout(() => old.forEach((l) => l.stop()), afterSeconds * 1000);
  }

  private loopNoise(ctx: AudioContext, kind: "white" | "brown" | "pink") {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, kind);
    src.loop = true;
    src.start();
    this.layers.push({ stop: () => src.stop() });
    return src;
  }

  private osc(ctx: AudioContext, type: OscillatorType, freq: number) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start();
    this.layers.push({ stop: () => o.stop() });
    return o;
  }

  /** Slow amplitude/frequency modulation. */
  private lfo(ctx: AudioContext, rate: number, depth: number, target: AudioParam) {
    const o = this.osc(ctx, "sine", rate);
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
  }

  private strike(ctx: AudioContext, out: AudioNode, freq: number, partials: number[], decay: number, level: number) {
    const now = ctx.currentTime;
    partials.forEach((ratio, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * ratio;
      o.detune.value = (Math.random() - 0.5) * 6;
      const peak = level / (i + 1.4);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay / (1 + i * 0.35));
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + decay + 0.1);
    });
  }

  private schedule(fn: () => void, minMs: number, maxMs: number) {
    const tick = () => {
      fn();
      this.timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
    };
    this.timers.push(window.setTimeout(tick, 400));
  }

  private build(id: SoundscapeId, ctx: AudioContext, out: GainNode) {
    switch (id) {
      case "morning-mist": {
        const wind = this.loopNoise(ctx, "pink");
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 700;
        lp.Q.value = 0.6;
        const windGain = ctx.createGain();
        windGain.gain.value = 0.55;
        wind.connect(lp).connect(windGain).connect(out);
        this.lfo(ctx, 0.05, 350, lp.frequency);
        this.lfo(ctx, 0.08, 0.2, windGain.gain);
        const pad = ctx.createGain();
        pad.gain.value = 0.06;
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = "lowpass";
        padFilter.frequency.value = 1200;
        pad.connect(padFilter).connect(out);
        [216, 324, 432, 433.5].forEach((f) => this.osc(ctx, "triangle", f).connect(pad));
        this.lfo(ctx, 0.07, 0.03, pad.gain);
        break;
      }
      case "singing-bowls": {
        const bed = this.loopNoise(ctx, "brown");
        const bedGain = ctx.createGain();
        bedGain.gain.value = 0.12;
        bed.connect(bedGain).connect(out);
        const bowls = [216, 288, 324];
        this.schedule(() => {
          const f = bowls[Math.floor(Math.random() * bowls.length)]!;
          this.strike(ctx, out, f, [1, 2.71, 5.12, 8.3], 9, 0.28);
        }, 5500, 9000);
        break;
      }
      case "temple-chimes": {
        const air = this.loopNoise(ctx, "pink");
        const hp = ctx.createBiquadFilter();
        hp.type = "bandpass";
        hp.frequency.value = 900;
        const airGain = ctx.createGain();
        airGain.gain.value = 0.18;
        air.connect(hp).connect(airGain).connect(out);
        const pentatonic = [864, 972, 1080, 1296, 1458, 1728];
        this.schedule(() => {
          const f = pentatonic[Math.floor(Math.random() * pentatonic.length)]!;
          this.strike(ctx, out, f, [1, 2.4, 3.9], 3.2, 0.12);
        }, 1400, 4200);
        break;
      }
      case "pine-forest-rain": {
        const rain = this.loopNoise(ctx, "white");
        const bp = ctx.createBiquadFilter();
        bp.type = "lowpass";
        bp.frequency.value = 3800;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 400;
        const rainGain = ctx.createGain();
        rainGain.gain.value = 0.22;
        rain.connect(hp).connect(bp).connect(rainGain).connect(out);
        this.lfo(ctx, 0.11, 0.06, rainGain.gain);
        const rumble = this.loopNoise(ctx, "brown");
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.value = 0.35;
        rumble.connect(rumbleGain).connect(out);
        this.schedule(() => this.strike(ctx, out, 2200 + Math.random() * 1800, [1], 0.08, 0.05), 120, 700);
        break;
      }
      case "binaural-432": {
        // 432Hz left, 440Hz right → an 8Hz alpha-range beat perceived between the ears.
        const merger = ctx.createChannelMerger(2);
        const g = ctx.createGain();
        g.gain.value = 0.12;
        this.osc(ctx, "sine", 432).connect(merger, 0, 0);
        this.osc(ctx, "sine", 440).connect(merger, 0, 1);
        merger.connect(g).connect(out);
        const bed = this.loopNoise(ctx, "brown");
        const bedGain = ctx.createGain();
        bedGain.gain.value = 0.15;
        bed.connect(bedGain).connect(out);
        break;
      }
    }
  }
}

export const ambient = new AmbientEngine();
