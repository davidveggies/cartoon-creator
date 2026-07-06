import type { Beat, CartoonProject, Scene, SceneBackground } from "../engine/types";
import { NARRATOR_VOICE_ID } from "../engine/catVoices";
import type { ParsedScreenplay, ParsedScreenplayScene } from "./ScreenplayParser";
import { GALLERY_ASSETS } from "./assetCatalog";

export interface CastMember {
  id: string;
  name: string;
  image: string;
  voicePreset?: string;
}

export interface CompileInput {
  title: string;
  screenplay: ParsedScreenplay;
  cast: CastMember[];
  defaultBackground: SceneBackground;
}

const ENTER_POSITIONS = ["inner-left", "inner-right", "center"] as const;

export function createEmptyProject(): CartoonProject {
  return {
    title: "Untitled Cartoon",
    characters: [],
    scenes: [
      {
        id: "empty",
        title: "—",
        background: {
          gradient: "linear-gradient(180deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
        },
        beats: [],
      },
    ],
  };
}

export function compileScreenplay(input: CompileInput): CartoonProject {
  const { title, screenplay, cast, defaultBackground } = input;
  validateCast(cast, screenplay);

  const nameToMember = buildCastLookup(cast);
  const onStage = new Set<string>();
  const enterIndex = new Map<string, number>();
  let positionCursor = 0;

  const scenes: Scene[] = screenplay.scenes.map((scene, sceneIdx) => {
    const beats: Beat[] = [];
    const enteredThisScene = new Set<string>();

    if (sceneIdx === 0) {
      beats.push({
        type: "title",
        title,
        subtitle: scene.title,
        duration: 2.5,
      });
    } else {
      beats.push({ type: "transition", style: "fade", duration: 0.6 });
    }

    for (const directive of scene.directives) {
      const member = resolveMember(directive.character, nameToMember);
      if (!member) continue;

      if (directive.action === "enter") {
        beats.push({
          type: "action",
          characterId: member.id,
          action: "enter",
          position: directive.position ?? nextPosition(enterIndex, member.id, positionCursor),
        });
        if (!directive.position) positionCursor++;
        onStage.add(member.id);
        enteredThisScene.add(member.id);
      } else if (directive.action === "exit") {
        beats.push({ type: "action", characterId: member.id, action: "exit" });
        onStage.delete(member.id);
      } else if (directive.action === "shake") {
        beats.push({ type: "action", characterId: member.id, action: "shake" });
      } else if (directive.action === "bounce") {
        beats.push({ type: "action", characterId: member.id, action: "bounce" });
      } else if (directive.action === "jump") {
        beats.push({ type: "action", characterId: member.id, action: "jump" });
      }
    }

    for (const line of scene.lines) {
      const isNarrator = line.speaker.toLowerCase() === "narrator";
      const member = isNarrator ? null : resolveMember(line.speaker, nameToMember);

      if (member && !onStage.has(member.id) && !enteredThisScene.has(member.id)) {
        const pos = nextPosition(enterIndex, member.id, positionCursor);
        positionCursor++;
        beats.push({
          type: "action",
          characterId: member.id,
          action: "enter",
          position: pos,
        });
        onStage.add(member.id);
        enteredThisScene.add(member.id);
      }

      beats.push({
        type: "dialogue",
        speaker: line.speaker,
        text: line.text,
        characterId: member?.id,
        focusCharacter: member?.id,
      });
    }

    return {
      id: slugify(scene.title) || `scene-${sceneIdx + 1}`,
      title: scene.title,
      background: resolveBackground(scene, defaultBackground),
      beats,
    };
  });

  return {
    title,
    characters: cast.map((c) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      size: "md" as const,
      voice: c.voicePreset
        ? { preset: c.voicePreset }
        : lineSpeakerIsNarrator(c.name)
          ? { preset: NARRATOR_VOICE_ID }
          : { preset: "tiny-tabby" },
    })),
    scenes,
  };
}

function validateCast(cast: CastMember[], screenplay: ParsedScreenplay): void {
  if (cast.length === 0) {
    throw new Error("Add at least one character with an image.");
  }

  const missingImage = cast.find((c) => !c.image);
  if (missingImage) {
    throw new Error(`Character "${missingImage.name}" needs an image (upload or pick from gallery).`);
  }

  const speakers = new Set<string>();
  for (const scene of screenplay.scenes) {
    for (const line of scene.lines) {
      if (line.speaker.toLowerCase() !== "narrator") {
        speakers.add(normalizeName(line.speaker));
      }
    }
  }

  for (const speaker of speakers) {
    const matched = cast.some((c) => normalizeName(c.name) === speaker);
    if (!matched) {
      throw new Error(
        `Speaker "${speaker}" is in the script but not in your cast. Add a character named "${speaker}".`
      );
    }
  }
}

function buildCastLookup(cast: CastMember[]): Map<string, CastMember> {
  const map = new Map<string, CastMember>();
  for (const member of cast) {
    map.set(normalizeName(member.name), member);
    map.set(normalizeName(member.id), member);
  }
  return map;
}

function resolveMember(name: string, lookup: Map<string, CastMember>): CastMember | null {
  return lookup.get(normalizeName(name)) ?? null;
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase();
}

function lineSpeakerIsNarrator(name: string): boolean {
  return name.toLowerCase() === "narrator";
}

function nextPosition(
  enterIndex: Map<string, number>,
  characterId: string,
  cursor: number
): (typeof ENTER_POSITIONS)[number] {
  if (!enterIndex.has(characterId)) {
    enterIndex.set(characterId, cursor);
  }
  const idx = enterIndex.get(characterId)!;
  return ENTER_POSITIONS[idx % ENTER_POSITIONS.length]!;
}

function resolveBackground(
  scene: ParsedScreenplayScene,
  fallback: SceneBackground
): SceneBackground {
  if (!scene.backgroundHint) return { ...fallback };

  const hint = scene.backgroundHint.toLowerCase();
  const match = GALLERY_ASSETS.find(
    (a) =>
      a.category === "background" &&
      (a.id.includes(hint) || a.label.toLowerCase().includes(hint) || hint.includes(a.id))
  );

  if (match) {
    return { image: match.path, groundLine: fallback.groundLine ?? "16%" };
  }

  return { ...fallback };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
