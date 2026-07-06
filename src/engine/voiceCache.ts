import {
  DEFAULT_CAT_VOICE_ID,
  NARRATOR_VOICE_ID,
  getCatVoicePreset,
  type VoiceProfile,
} from "./catVoices";

type VoiceRole = "narrator" | "character" | "title";

export interface SpeakProfile {
  presetId: string;
  pitch: number;
  rate: number;
}

export interface SpeakOptionsLike {
  role?: VoiceRole;
  voice?: VoiceProfile;
  catVoiceId?: string;
}

export function resolveSpeakProfile(options: SpeakOptionsLike = {}): SpeakProfile {
  if (options.role === "narrator" || options.role === "title") {
    const preset = getCatVoicePreset(NARRATOR_VOICE_ID);
    return { presetId: NARRATOR_VOICE_ID, pitch: preset.pitch, rate: preset.rate };
  }

  if (options.voice) {
    const preset = getCatVoicePreset(options.voice.presetId);
    return {
      presetId: options.voice.presetId,
      pitch: options.voice.pitch ?? preset.pitch,
      rate: options.voice.rate ?? preset.rate,
    };
  }

  const presetId = options.catVoiceId ?? DEFAULT_CAT_VOICE_ID;
  const preset = getCatVoicePreset(presetId);
  return { presetId, pitch: preset.pitch, rate: preset.rate };
}

export function voiceCacheKey(
  text: string,
  presetId: string,
  pitch: number,
  rate: number
): string {
  const raw = `${presetId}|${pitch}|${rate}|${text.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function voiceCacheUrl(key: string): string {
  return `/assets/voice-cache/${key}.mp3`;
}
