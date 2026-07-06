import { project } from "../project";
import { GROUP_SPEAKER_VOICES } from "./catVoices";
import type { DialogueBeat } from "./types";
import { resolveSpeakProfile, type SpeakProfile } from "./voiceCache";

export interface SpeechLine extends SpeakProfile {
  text: string;
}

export function collectSpeechLines(): SpeechLine[] {
  const lines: SpeechLine[] = [];
  const seen = new Set<string>();

  for (const scene of project.scenes) {
    for (const beat of scene.beats) {
      if (beat.type === "dialogue") {
        const profile =
          beat.speaker === "Narrator"
            ? resolveSpeakProfile({ role: "narrator" })
            : dialogueProfile(beat);
        pushLine(lines, seen, beat.text, profile);
      }

      if (beat.type === "title") {
        const text = [beat.title, beat.subtitle].filter(Boolean).join(". ");
        if (text) {
          pushLine(lines, seen, text, resolveSpeakProfile({ role: "title" }));
        }
      }
    }
  }

  return lines;
}

function dialogueProfile(beat: DialogueBeat): SpeakProfile {
  const id = beat.focusCharacter ?? beat.characterId;
  if (id) {
    const def = findCharacter(id);
    if (def?.voice?.preset) {
      return resolveSpeakProfile({
        role: "character",
        voice: {
          presetId: def.voice.preset,
          pitch: def.voice.pitch,
          rate: def.voice.rate,
        },
      });
    }
  }

  if (beat.speaker) {
    const byName = project.characters.find((c) => c.name === beat.speaker);
    if (byName?.voice?.preset) {
      return resolveSpeakProfile({
        role: "character",
        voice: {
          presetId: byName.voice.preset,
          pitch: byName.voice.pitch,
          rate: byName.voice.rate,
        },
      });
    }

    const groupPreset = GROUP_SPEAKER_VOICES[beat.speaker];
    if (groupPreset) {
      return resolveSpeakProfile({ role: "character", voice: { presetId: groupPreset } });
    }
  }

  return resolveSpeakProfile({ role: "character" });
}

function findCharacter(id: string) {
  for (const scene of project.scenes) {
    const found = scene.characters?.find((c) => c.id === id);
    if (found) return { ...project.characters.find((c) => c.id === id), ...found };
  }
  return project.characters.find((c) => c.id === id);
}

function pushLine(
  lines: SpeechLine[],
  seen: Set<string>,
  text: string,
  profile: SpeakProfile
): void {
  const key = `${profile.presetId}|${profile.pitch}|${profile.rate}|${text.trim()}`;
  if (seen.has(key)) return;
  seen.add(key);
  lines.push({ text: text.trim(), ...profile });
}
