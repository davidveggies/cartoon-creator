export interface CatVoicePreset {
  id: string;
  label: string;
  description: string;
  pitch: number;
  rate: number;
  /** Prefer system voices whose name matches any of these (case-insensitive) */
  voiceHints?: string[];
}

export interface VoiceProfile {
  presetId: string;
  pitch?: number;
  rate?: number;
}

export const CAT_VOICE_SAMPLE =
  "Hi! I'm Rufus — and this is Archibald!";

export const DEFAULT_CAT_VOICE_ID = "tiny-tabby";
export const NARRATOR_VOICE_ID = "storybook-narrator";

export const CAT_VOICE_PRESETS: CatVoicePreset[] = [
  {
    id: "storybook-narrator",
    label: "Storybook Narrator",
    description: "Warm and calm — tells the tale",
    pitch: 0.88,
    rate: 0.96,
    voiceHints: ["daniel", "tom", "alex", "david", "james"],
  },
  {
    id: "rufus-voice",
    label: "Rufus",
    description: "Super squeaky little kitten",
    pitch: 1.78,
    rate: 1.24,
    voiceHints: ["junior", "karen", "victoria"],
  },
  {
    id: "archibald-voice",
    label: "Archibald",
    description: "Slow, pompous, very important",
    pitch: 1.48,
    rate: 0.82,
    voiceHints: ["fred", "bruce", "alex"],
  },
  {
    id: "nora-voice",
    label: "Nora",
    description: "Friendly human girl",
    pitch: 1.18,
    rate: 1.06,
    voiceHints: ["samantha", "kathy", "zira", "victoria"],
  },
  {
    id: "loco-voice",
    label: "Loco",
    description: "Gruff, tough alley cat",
    pitch: 0.92,
    rate: 1.14,
    voiceHints: ["alex", "daniel", "bruce", "tom"],
  },
  {
    id: "coco-voice",
    label: "Coco",
    description: "Hyper chipmunk speed",
    pitch: 1.72,
    rate: 1.38,
    voiceHints: ["junior", "jester", "boing", "karen"],
  },
  {
    id: "black-kitties-voice",
    label: "Black Kitties",
    description: "Chorus of mellow black cats",
    pitch: 1.28,
    rate: 0.9,
    voiceHints: ["kathy", "samantha", "karen"],
  },
  {
    id: "special-kitties-voice",
    label: "Special Kitties",
    description: "Orange squad — extra squeaky",
    pitch: 1.82,
    rate: 1.3,
    voiceHints: ["junior", "victoria", "karen"],
  },
  {
    id: "kitten-classic",
    label: "Kitten Classic",
    description: "Bright and bouncy cartoon kitten",
    pitch: 1.38,
    rate: 1.08,
    voiceHints: ["junior", "kathy", "samantha", "zira"],
  },
  {
    id: "tiny-tabby",
    label: "Tiny Tabby",
    description: "Extra small and squeaky",
    pitch: 1.62,
    rate: 1.18,
    voiceHints: ["junior", "karen", "victoria"],
  },
  {
    id: "cartoon-kitty",
    label: "Cartoon Kitty",
    description: "Fast and playful",
    pitch: 1.48,
    rate: 1.22,
    voiceHints: ["fred", "jester", "junior", "boing"],
  },
];

/** Group speakers that are not individual characters */
export const GROUP_SPEAKER_VOICES: Record<string, string> = {
  "Black Kitties": "black-kitties-voice",
  "Special Kitties": "special-kitties-voice",
};

export function getCatVoicePreset(id?: string): CatVoicePreset {
  const preset = CAT_VOICE_PRESETS.find((p) => p.id === id);
  return preset ?? CAT_VOICE_PRESETS.find((p) => p.id === DEFAULT_CAT_VOICE_ID)!;
}

export function resolveVoiceProfile(
  presetId: string,
  overrides?: { pitch?: number; rate?: number }
): VoiceProfile {
  const preset = getCatVoicePreset(presetId);
  return {
    presetId,
    pitch: overrides?.pitch ?? preset.pitch,
    rate: overrides?.rate ?? preset.rate,
  };
}
