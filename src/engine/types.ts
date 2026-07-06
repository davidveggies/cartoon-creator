export type EasingName =
  | "linear"
  | "power1.inOut"
  | "power2.inOut"
  | "power3.out"
  | "back.out"
  | "elastic.out"
  | "bounce.out";

export type CharacterPosition =
  | "left"
  | "inner-left"
  | "center"
  | "inner-right"
  | "right";

export interface CharacterDef {
  id: string;
  name: string;
  image: string;
  /** Visual scale on stage */
  size?: "sm" | "md" | "lg";
  /** Optional alternate expressions keyed by name */
  expressions?: Record<string, string>;
  /** Distinct cartoon voice */
  voice?: {
    preset?: string;
    pitch?: number;
    rate?: number;
  };
}

export interface SceneBackground {
  image?: string;
  color?: string;
  /** CSS gradient fallback */
  gradient?: string;
  /** Where characters stand on the stage (default 8%) */
  groundLine?: string;
}

export interface TitleBeat {
  type: "title";
  title: string;
  subtitle?: string;
  duration?: number;
}

export interface DialogueBeat {
  type: "dialogue";
  speaker?: string;
  characterId?: string;
  text: string;
  /** How long the line stays on screen (ms). Auto-calculated if omitted. */
  duration?: number;
  /** Highlight which character is talking */
  focusCharacter?: string;
  /** Optional expression change */
  expression?: string;
}

export interface ActionBeat {
  type: "action";
  characterId: string;
  action:
    | "enter"
    | "exit"
    | "move"
    | "march"
    | "bounce"
    | "shake"
    | "jump"
    | "dance"
    | "fadeIn"
    | "fadeOut"
    | "setExpression";
  position?: CharacterPosition;
  expression?: string;
  duration?: number;
  delay?: number;
}

export interface TransitionBeat {
  type: "transition";
  style: "fade" | "wipe" | "flash" | "pageFlip";
  duration?: number;
}

export interface PauseBeat {
  type: "pause";
  duration: number;
}

export interface PanelBeat {
  type: "panel";
  image: string;
  caption?: string;
}

export interface CrowdBeat {
  type: "crowd";
  /** Visual cat sprites (story may say 10,000 — we show a lively crowd) */
  count?: number;
  images?: string[];
  duration?: number;
  /** Apply orange styling to the whole crowd */
  style?: "orange";
}

export interface SfxBeat {
  type: "sfx";
  sfx: "thunder" | "screech" | "carStop" | "boing" | "whoosh" | "meow" | "crowd" | "title";
  repeat?: number;
  interval?: number;
}

export interface WeatherBeat {
  type: "weather";
  effect: "thunderstorm" | "clear";
  /** Seconds to hold before resolving (storm keeps running unless cleared). */
  duration?: number;
}

export interface RainDogsBeat {
  type: "rainDogs";
  /** How many glowing dogs fall during the beat */
  count?: number;
  /** Seconds the dog rain lasts */
  duration?: number;
}

export interface MusicBeat {
  type: "music";
  track: "happy-dance";
  loop?: boolean;
  /** 0–1 playback volume (default 0.65) */
  volume?: number;
}

export type Beat =
  | TitleBeat
  | DialogueBeat
  | ActionBeat
  | TransitionBeat
  | PauseBeat
  | PanelBeat
  | CrowdBeat
  | SfxBeat
  | WeatherBeat
  | RainDogsBeat
  | MusicBeat;

export interface Scene {
  id: string;
  title: string;
  background: SceneBackground;
  characters?: CharacterDef[];
  beats: Beat[];
}

export interface CartoonProject {
  title: string;
  characters: CharacterDef[];
  scenes: Scene[];
}
