import { Howl, Howler } from 'howler';
import type { WeatherMode } from '../types/portfolio';

function encodeWavDataUrl(samples: Float32Array, sampleRate = 22050): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function createToneSamples(
  durationSec: number,
  sampleRate: number,
  generator: (t: number, progress: number) => number,
): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    out[i] = generator(t, i / length);
  }
  return out;
}

class SoundEngine {
  private enabled = false;
  private musicEnabled = true;
  private sfxVolume = 0.8;
  private musicVolume = 0.45;
  private initialized = false;
  private hornSound: Howl | null = null;
  private jumpSound: Howl | null = null;
  private chimeSound: Howl | null = null;
  private achievementSound: Howl | null = null;
  private collectSound: Howl | null = null;
  private clickSound: Howl | null = null;
  private impactSound: Howl | null = null;
  private beepLowSound: Howl | null = null;
  private beepHighSound: Howl | null = null;

  private engineCtx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private accelOsc: OscillatorNode | null = null;
  private accelGain: GainNode | null = null;
  private boostOsc: OscillatorNode | null = null;
  private boostGain: GainNode | null = null;
  private brakeGain: GainNode | null = null;
  private driftGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private musicTimerId: number | null = null;
  private musicStep = 0;

  private initSounds() {
    if (this.initialized) return;
    this.initialized = true;
    const sr = 22050;

    const hornSamples = createToneSamples(0.28, sr, (t, p) => {
      const env = Math.sin(Math.PI * Math.min(1, p * 4)) * (1 - p * 0.4);
      return (
        (Math.sin(2 * Math.PI * 349.23 * t) * 0.5 +
          Math.sin(2 * Math.PI * 440 * t) * 0.5) *
        env *
        0.38
      );
    });

    const jumpSamples = createToneSamples(0.24, sr, (t, p) => {
      const freq = 180 + p * 340;
      const env = (1 - p) * (1 - p);
      return Math.sin(2 * Math.PI * freq * t) * env * 0.35;
    });

    const chimeSamples = createToneSamples(0.42, sr, (t, p) => {
      const freq = p < 0.45 ? 523.25 : 659.25;
      const env = Math.exp(-p * 3.8);
      return Math.sin(2 * Math.PI * freq * t) * env * 0.35;
    });

    const achievementSamples = createToneSamples(0.75, sr, (t, p) => {
      const freq =
        p < 0.22 ? 523.25 : p < 0.44 ? 659.25 : p < 0.68 ? 783.99 : 1046.5;
      const noteProgress = (p % 0.23) / 0.23;
      const env = Math.exp(-noteProgress * 2.2) * (1 - p * 0.35);
      return (
        (Math.sin(2 * Math.PI * freq * t) * 0.72 +
          Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.28) *
        env *
        0.36
      );
    });

    const collectSamples = createToneSamples(0.32, sr, (t, p) => {
      const freq = p < 0.35 ? 659.25 : p < 0.7 ? 783.99 : 1046.5;
      const env = Math.exp(-p * 3.2);
      return Math.sin(2 * Math.PI * freq * t) * env * 0.32;
    });

    const clickSamples = createToneSamples(0.06, sr, (t, p) => {
      const env = Math.exp(-p * 10);
      return Math.sin(2 * Math.PI * 620 * t) * env * 0.25;
    });

    const impactSamples = createToneSamples(0.18, sr, (t, p) => {
      const freq = 110 * (1 - p * 0.6);
      const env = Math.exp(-p * 8);
      return (Math.sin(2 * Math.PI * freq * t) * 0.7 + (Math.random() * 2 - 1) * 0.3) * env * 0.4;
    });

    const beepLowSamples = createToneSamples(0.14, sr, (t, p) => {
      const env = Math.exp(-p * 5);
      return Math.sin(2 * Math.PI * 440 * t) * env * 0.32;
    });

    const beepHighSamples = createToneSamples(0.24, sr, (t, p) => {
      const env = Math.exp(-p * 3.5);
      return Math.sin(2 * Math.PI * 880 * t) * env * 0.35;
    });

    this.hornSound = new Howl({ src: [encodeWavDataUrl(hornSamples, sr)], volume: 0.55 });
    this.jumpSound = new Howl({ src: [encodeWavDataUrl(jumpSamples, sr)], volume: 0.45 });
    this.chimeSound = new Howl({ src: [encodeWavDataUrl(chimeSamples, sr)], volume: 0.5 });
    this.achievementSound = new Howl({
      src: [encodeWavDataUrl(achievementSamples, sr)],
      volume: 0.58,
    });
    this.collectSound = new Howl({ src: [encodeWavDataUrl(collectSamples, sr)], volume: 0.48 });
    this.clickSound = new Howl({ src: [encodeWavDataUrl(clickSamples, sr)], volume: 0.35 });
    this.impactSound = new Howl({ src: [encodeWavDataUrl(impactSamples, sr)], volume: 0.45 });
    this.beepLowSound = new Howl({ src: [encodeWavDataUrl(beepLowSamples, sr)], volume: 0.45 });
    this.beepHighSound = new Howl({ src: [encodeWavDataUrl(beepHighSamples, sr)], volume: 0.5 });

    this.applyVolumeLevels();
  }

  private ensureEngineLoop() {
    if (this.engineCtx || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.engineCtx = ctx;

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = this.enabled ? this.sfxVolume : 0;
      sfxBus.connect(ctx.destination);
      this.sfxBus = sfxBus;

      const musicBus = ctx.createGain();
      musicBus.gain.value = this.enabled && this.musicEnabled ? this.musicVolume * 0.35 : 0;
      musicBus.connect(ctx.destination);
      this.musicBus = musicBus;

      // Primary engine rumble
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 54;
      filter.type = 'lowpass';
      filter.frequency.value = 210;
      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxBus);
      osc.start();

      // Throttle acceleration harmonic swell
      const accelOsc = ctx.createOscillator();
      const accelFilter = ctx.createBiquadFilter();
      const accelGain = ctx.createGain();
      accelOsc.type = 'triangle';
      accelOsc.frequency.value = 96;
      accelFilter.type = 'lowpass';
      accelFilter.frequency.value = 340;
      accelGain.gain.value = 0;
      accelOsc.connect(accelFilter);
      accelFilter.connect(accelGain);
      accelGain.connect(sfxBus);
      accelOsc.start();

      // Boost turbine layer
      const boostOsc = ctx.createOscillator();
      const boostFilter = ctx.createBiquadFilter();
      const boostGain = ctx.createGain();
      boostOsc.type = 'sine';
      boostOsc.frequency.value = 220;
      boostFilter.type = 'bandpass';
      boostFilter.frequency.value = 520;
      boostGain.gain.value = 0;
      boostOsc.connect(boostFilter);
      boostFilter.connect(boostGain);
      boostGain.connect(sfxBus);
      boostOsc.start();

      // Filtered noise shared by ambient wind/rain, braking pad hiss, and tire drift screech
      const noiseLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04;
        data[i] = last * 1.4;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 380;
      windFilter.Q.value = 1.1;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      noiseSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(sfxBus);

      const brakeFilter = ctx.createBiquadFilter();
      brakeFilter.type = 'bandpass';
      brakeFilter.frequency.value = 720;
      brakeFilter.Q.value = 2.0;
      const brakeGain = ctx.createGain();
      brakeGain.gain.value = 0;
      noiseSrc.connect(brakeFilter);
      brakeFilter.connect(brakeGain);
      brakeGain.connect(sfxBus);

      const driftFilter = ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.value = 1150;
      driftFilter.Q.value = 3.2;
      const driftGain = ctx.createGain();
      driftGain.gain.value = 0;
      noiseSrc.connect(driftFilter);
      driftFilter.connect(driftGain);
      driftGain.connect(sfxBus);

      noiseSrc.start();

      this.engineOsc = osc;
      this.engineGain = gain;
      this.accelOsc = accelOsc;
      this.accelGain = accelGain;
      this.boostOsc = boostOsc;
      this.boostGain = boostGain;
      this.brakeGain = brakeGain;
      this.driftGain = driftGain;
      this.ambientGain = windGain;
      this.windFilter = windFilter;
    } catch {
      // Blocked until user gesture
    }
  }

  private scheduleMusicNote(freq: number, durationSec: number, gainAmt: number): void {
    const ctx = this.engineCtx;
    const bus = this.musicBus;
    if (!ctx || !bus || !this.enabled || !this.musicEnabled || this.musicVolume <= 0.01) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainAmt, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(env);
    env.connect(bus);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  private ensureMusicLoop(): void {
    if (typeof window === 'undefined') return;
    if (!this.enabled || !this.musicEnabled || this.musicVolume <= 0.01) {
      if (this.musicTimerId !== null) {
        window.clearInterval(this.musicTimerId);
        this.musicTimerId = null;
      }
      return;
    }

    if (this.musicTimerId !== null) return;
    // Gentle sunlit marimba/kalimba pentatonic progression (C5-D5-E5-G5-A5 over warm roots)
    const roots = [130.81, 146.83, 164.81, 130.81]; // C3, D3, E3, C3
    const melody = [261.63, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63, 293.66];

    this.musicTimerId = window.setInterval(() => {
      if (!this.enabled || !this.musicEnabled || !this.engineCtx || this.engineCtx.state !== 'running') {
        return;
      }
      const step = this.musicStep % 8;
      if (step % 2 === 0) {
        const rootFreq = roots[Math.floor(this.musicStep / 8) % roots.length];
        this.scheduleMusicNote(rootFreq, 0.9, 0.14);
      }
      this.scheduleMusicNote(melody[step], 0.48, 0.11);
      this.musicStep += 1;
    }, 460);
  }

  private applyVolumeLevels(): void {
    Howler.volume(this.enabled ? this.sfxVolume : 0);
    Howler.mute(!this.enabled);

    if (this.engineCtx) {
      const now = this.engineCtx.currentTime;
      this.sfxBus?.gain.setTargetAtTime(this.enabled ? this.sfxVolume : 0, now, 0.04);
      this.musicBus?.gain.setTargetAtTime(
        this.enabled && this.musicEnabled ? this.musicVolume * 0.35 : 0,
        now,
        0.08,
      );
    }
    this.ensureMusicLoop();
  }

  setAudioPreferences(
    enabled: boolean,
    sfxVolume: number,
    musicVolume: number,
    musicEnabled: boolean,
  ): void {
    const prevEnabled = this.enabled;
    this.enabled = enabled;
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    this.musicVolume = Math.max(0, Math.min(1, musicVolume));
    this.musicEnabled = musicEnabled;

    if (enabled) {
      this.initSounds();
      this.ensureEngineLoop();
      if (this.engineCtx && this.engineCtx.state === 'suspended') {
        this.engineCtx.resume().catch(() => {});
      }
    } else if (prevEnabled && this.engineCtx) {
      const now = this.engineCtx.currentTime;
      this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
      this.accelGain?.gain.setTargetAtTime(0, now, 0.05);
      this.boostGain?.gain.setTargetAtTime(0, now, 0.05);
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.05);
      this.driftGain?.gain.setTargetAtTime(0, now, 0.05);
      this.ambientGain?.gain.setTargetAtTime(0, now, 0.05);
    }

    this.applyVolumeLevels();
  }

  setEnabled(next: boolean): void {
    this.setAudioPreferences(next, this.sfxVolume, this.musicVolume, this.musicEnabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  hasInitializedAudioContext(): boolean {
    return this.engineCtx !== null;
  }

  updateEngine(
    speedKmh: number,
    isBoosting: boolean,
    isPlaying: boolean,
    isDrifting = false,
    throttleAmt = 0,
    isBraking = false,
    weatherMode: WeatherMode = 'sunny',
  ): void {
    if (!this.enabled || !this.engineOsc || !this.engineGain || !this.engineCtx) return;
    const now = this.engineCtx.currentTime;
    const weatherWindBase =
      weatherMode === 'rain' ? 0.048 : weatherMode === 'fog' ? 0.024 : weatherMode === 'night' ? 0.014 : 0.016;

    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(
        weatherMode === 'rain' ? 1280 : weatherMode === 'fog' ? 320 : 380,
        now,
        0.35,
      );
      this.windFilter.Q.setTargetAtTime(weatherMode === 'rain' ? 0.65 : 1.1, now, 0.35);
    }

    if (!isPlaying) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.accelGain?.gain.setTargetAtTime(0, now, 0.08);
      this.boostGain?.gain.setTargetAtTime(0, now, 0.08);
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.08);
      this.driftGain?.gain.setTargetAtTime(0, now, 0.08);
      this.ambientGain?.gain.setTargetAtTime(weatherWindBase, now, 0.25);
      return;
    }

    const norm = Math.min(1, speedKmh / 65);
    const freq = 48 + norm * 78 + (isBoosting ? 24 : 0);
    const vol = 0.022 + norm * 0.042 + (isBoosting ? 0.018 : 0);
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.06);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);

    const accelEffort = Math.abs(throttleAmt);
    this.accelOsc?.frequency.setTargetAtTime(92 + norm * 145 + accelEffort * 36, now, 0.07);
    this.accelGain?.gain.setTargetAtTime(
      accelEffort > 0.1 ? 0.014 + accelEffort * 0.024 : 0,
      now,
      0.08,
    );

    this.boostOsc?.frequency.setTargetAtTime(210 + norm * 180, now, 0.06);
    this.boostGain?.gain.setTargetAtTime(isBoosting ? 0.036 : 0, now, 0.05);

    const brakingActive = isBraking && speedKmh > 3;
    this.brakeGain?.gain.setTargetAtTime(brakingActive ? 0.038 * Math.min(1, speedKmh / 25) : 0, now, 0.05);

    this.driftGain?.gain.setTargetAtTime(isDrifting ? 0.045 : 0, now, 0.06);
    this.ambientGain?.gain.setTargetAtTime(weatherWindBase + norm * 0.035, now, 0.15);
  }

  playHorn(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.hornSound?.play();
  }

  playJump(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.jumpSound?.play();
  }

  playChime(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.chimeSound?.play();
  }

  playAchievement(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.achievementSound?.play();
  }

  playCollect(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.collectSound?.play();
  }

  playClick(): void {
    if (!this.enabled) return;
    this.initSounds();
    this.clickSound?.play();
  }

  playImpact(intensity = 0.7): void {
    if (!this.enabled) return;
    this.initSounds();
    if (this.impactSound) {
      this.impactSound.volume(Math.min(0.65, Math.max(0.18, intensity * 0.45)));
      this.impactSound.play();
    }
  }

  playCountdownBeep(go = false): void {
    if (!this.enabled) return;
    this.initSounds();
    if (go) this.beepHighSound?.play();
    else this.beepLowSound?.play();
  }

  dispose(): void {
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.accelOsc?.stop();
        this.boostOsc?.stop();
      } catch {
        // ignore
      }
    }
    this.engineCtx?.close().catch(() => {});
    this.engineCtx = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.accelOsc = null;
    this.accelGain = null;
    this.boostOsc = null;
    this.boostGain = null;
    this.brakeGain = null;
    this.driftGain = null;
    this.ambientGain = null;
    this.windFilter = null;
  }
}

export const soundEngine = new SoundEngine();
