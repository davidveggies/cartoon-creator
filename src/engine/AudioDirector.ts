import {
  DEFAULT_CAT_VOICE_ID,
  NARRATOR_VOICE_ID,
  getCatVoicePreset,
  type VoiceProfile,
} from "./catVoices";
import {
  resolveSpeakProfile,
  voiceCacheKey,
  voiceCacheUrl,
  type SpeakOptionsLike,
} from "./voiceCache";

type VoiceRole = "narrator" | "character" | "title";

interface SpeakOptions extends SpeakOptionsLike {
  role?: VoiceRole;
  voice?: VoiceProfile;
  /** @deprecated use voice.presetId */
  catVoiceId?: string;
}

const MUSIC_TRACKS = {
  "happy-dance": "/assets/audio/all-of-the-kittens.mp3",
} as const;

export type MusicTrackName = keyof typeof MUSIC_TRACKS;

export class AudioDirector {
  private enabled = true;
  private unlocked = false;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private musicSourceNode: MediaElementAudioSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentSpeechSource: AudioBufferSourceNode | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private musicTrack: MusicTrackName | null = null;
  private musicFadeTimer: number | null = null;

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.stopSpeech();
      this.stopMusic(0);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    void this.ctx?.resume();
  }

  /** Mix all app audio into a MediaStream for video recording. */
  startRecordingMix(): MediaStream {
    const ctx = this.ensureCtx();
    if (!this.recordingDestination) {
      this.recordingDestination = ctx.createMediaStreamDestination();
      this.ensureMaster().connect(this.recordingDestination);
    }
    return this.recordingDestination.stream;
  }

  stopRecordingMix(): void {
    if (this.recordingDestination && this.masterGain) {
      this.masterGain.disconnect(this.recordingDestination);
      this.recordingDestination = null;
    }
  }

  stopSpeech(): void {
    if (this.currentSpeechSource) {
      try {
        this.currentSpeechSource.stop();
      } catch {
        /* already stopped */
      }
      this.currentSpeechSource.disconnect();
      this.currentSpeechSource = null;
    }

    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  pauseSpeech(): void {
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }

  resumeSpeech(): void {
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.enabled || !text.trim()) return Promise.resolve();

    this.unlock();
    this.stopSpeech();

    return this.playCachedSpeech(text, options).catch(() =>
      this.speakWithSynthesis(text, options)
    );
  }

  playMusic(
    track: MusicTrackName,
    options: { loop?: boolean; volume?: number } = {}
  ): void {
    if (!this.enabled) return;
    this.unlock();
    this.cancelMusicFade();

    const src = MUSIC_TRACKS[track];
    if (!this.musicEl) {
      this.musicEl = new Audio();
      this.musicEl.preload = "auto";
    }

    this.wireMusicToMix();

    const loop = options.loop ?? true;
    const volume = options.volume ?? 0.65;

    if (this.musicTrack !== track) {
      this.musicEl.pause();
      this.musicEl.currentTime = 0;
      this.musicEl.src = src;
    }

    this.musicTrack = track;
    this.musicEl.loop = loop;
    this.musicEl.volume = volume;

    void this.musicEl.play().catch(() => {
      // Blocked until the user unlocks audio with a gesture.
    });
  }

  pauseMusic(): void {
    this.musicEl?.pause();
  }

  resumeMusic(): void {
    if (!this.enabled || !this.musicEl || !this.musicTrack) return;
    void this.musicEl.play().catch(() => {});
  }

  /** Fade out and stop background music. Pass 0 for an immediate stop. */
  stopMusic(fadeMs = 800): void {
    if (!this.musicEl) return;
    this.cancelMusicFade();

    if (fadeMs <= 0 || this.musicEl.paused) {
      this.stopMusicImmediate();
      return;
    }

    const el = this.musicEl;
    const startVolume = el.volume;
    const steps = Math.max(1, Math.round(fadeMs / 40));
    let step = 0;

    this.musicFadeTimer = window.setInterval(() => {
      step++;
      el.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        this.stopMusicImmediate();
      }
    }, fadeMs / steps);
  }

  playSfx(name: SfxName): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.ensureCtx();
    const master = this.ensureMaster();

    switch (name) {
      case "screech":
        playScreech(ctx, master);
        break;
      case "carStop":
        playCarStop(ctx, master);
        break;
      case "boing":
        playBoing(ctx, master);
        break;
      case "whoosh":
        playWhoosh(ctx, master);
        break;
      case "meow":
        playMeow(ctx, master);
        break;
      case "crowd":
        playCrowdMeows(ctx, master);
        break;
      case "title":
        playTitleChime(ctx, master);
        break;
      case "thunder":
        playThunder(ctx, master);
        break;
    }
  }

  private ensureCtx(): AudioContext {
    this.unlock();
    if (!this.ctx) {
      throw new Error("AudioContext unavailable");
    }
    return this.ctx;
  }

  private ensureMaster(): GainNode {
    const ctx = this.ensureCtx();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  private wireMusicToMix(): void {
    if (!this.musicEl || !this.ctx || this.musicSourceNode) return;
    this.musicSourceNode = this.ctx.createMediaElementSource(this.musicEl);
    this.musicSourceNode.connect(this.ensureMaster());
  }

  private async playCachedSpeech(text: string, options: SpeakOptions): Promise<void> {
    const profile = resolveSpeakProfile(options);
    const key = voiceCacheKey(text, profile.presetId, profile.pitch, profile.rate);
    const url = voiceCacheUrl(key);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Missing voice cache: ${url}`);
    }

    const ctx = this.ensureCtx();
    const master = this.ensureMaster();
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(master);
      this.currentSpeechSource = source;

      const finish = () => {
        if (this.currentSpeechSource === source) {
          this.currentSpeechSource = null;
        }
        resolve();
      };

      source.onended = finish;
      source.start();
    });
  }

  private speakWithSynthesis(text: string, options: SpeakOptions): Promise<void> {
    if (typeof speechSynthesis === "undefined") return Promise.resolve();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      utterance.lang = "en-US";
      this.applyVoiceSettings(utterance, options);

      const finish = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      speechSynthesis.speak(utterance);
    });
  }

  private cancelMusicFade(): void {
    if (this.musicFadeTimer !== null) {
      window.clearInterval(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
  }

  private stopMusicImmediate(): void {
    this.cancelMusicFade();
    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl.currentTime = 0;
      this.musicEl.volume = 0.65;
    }
    this.musicTrack = null;
  }

  private applyVoiceSettings(utterance: SpeechSynthesisUtterance, options: SpeakOptions): void {
    applyVoiceSettings(utterance, options);
  }
}

function applyPreset(
  utterance: SpeechSynthesisUtterance,
  presetId: string,
  pitch?: number,
  rate?: number
): void {
  const preset = getCatVoicePreset(presetId);
  utterance.pitch = pitch ?? preset.pitch;
  utterance.rate = rate ?? preset.rate;
  const voice = pickVoice(preset.voiceHints ?? []);
  if (voice) utterance.voice = voice;
}

function applyVoiceSettings(
  utterance: SpeechSynthesisUtterance,
  options: SpeakOptions
): void {
  if (options.role === "narrator" || options.role === "title") {
    applyPreset(utterance, NARRATOR_VOICE_ID);
    return;
  }

  if (options.voice) {
    applyPreset(
      utterance,
      options.voice.presetId,
      options.voice.pitch,
      options.voice.rate
    );
    return;
  }

  const presetId = options.catVoiceId ?? DEFAULT_CAT_VOICE_ID;
  applyPreset(utterance, presetId);
}

export type SfxName =
  | "screech"
  | "carStop"
  | "boing"
  | "whoosh"
  | "meow"
  | "crowd"
  | "title"
  | "thunder";

function pickVoice(hints: string[]): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length ? english : voices;

  for (const hint of hints) {
    const match = pool.find((v) => v.name.toLowerCase().includes(hint.toLowerCase()));
    if (match) return match;
  }

  return pool[0];
}

function playScreech(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const duration = 2.4;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(2400, t);
  osc.frequency.exponentialRampToValueAtTime(320, t + duration * 0.72);
  osc.frequency.exponentialRampToValueAtTime(680, t + duration);
  oscGain.gain.setValueAtTime(0.0001, t);
  oscGain.gain.exponentialRampToValueAtTime(0.42, t + 0.03);
  oscGain.gain.setValueAtTime(0.38, t + duration * 0.55);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(oscGain);

  const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2200, t);
  noiseFilter.frequency.exponentialRampToValueAtTime(900, t + duration * 0.8);
  noiseFilter.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.28, t + 0.04);
  noiseGain.gain.setValueAtTime(0.22, t + duration * 0.5);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  const mix = ctx.createGain();
  mix.gain.value = 1.15;
  oscGain.connect(mix);
  noiseGain.connect(mix);
  mix.connect(master);

  osc.start(t);
  osc.stop(t + duration + 0.05);
  noise.start(t);
  noise.stop(t + duration + 0.05);
}

function playCarStop(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.value = 0.25;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
}

function playBoing(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(320, t + 0.22);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.3);
}

function playWhoosh(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.linearRampToValueAtTime(200, t + 0.25);
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
}

function playMeow(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(620, t);
  osc.frequency.linearRampToValueAtTime(880, t + 0.08);
  osc.frequency.linearRampToValueAtTime(420, t + 0.35);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.42);
}

function playCrowdMeows(ctx: AudioContext, master: GainNode): void {
  for (let i = 0; i < 5; i++) {
    window.setTimeout(() => playMeow(ctx, master), i * 120 + Math.random() * 80);
  }
}

function playThunder(ctx: AudioContext, master: GainNode): void {
  const t = ctx.currentTime;
  const duration = 1.1;

  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.pow(1 - i / data.length, 1.6);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const low = ctx.createOscillator();
  const lowGain = ctx.createGain();
  low.type = "sine";
  low.frequency.setValueAtTime(52, t);
  low.frequency.exponentialRampToValueAtTime(28, t + duration);
  lowGain.gain.setValueAtTime(0.0001, t);
  lowGain.gain.exponentialRampToValueAtTime(0.85, t + 0.02);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  low.connect(lowGain);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(420, t);
  filter.frequency.exponentialRampToValueAtTime(90, t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  src.connect(filter);
  filter.connect(gain);
  const mix = ctx.createGain();
  mix.gain.value = 1.35;
  gain.connect(mix);
  lowGain.connect(mix);
  mix.connect(master);

  src.start(t);
  src.stop(t + duration + 0.05);
  low.start(t);
  low.stop(t + duration + 0.05);
}

function playTitleChime(ctx: AudioContext, master: GainNode): void {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
