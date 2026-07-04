export type EasingName =
  | "linear"
  | "power1.inOut"
  | "power2.inOut"
  | "power3.out"
  | "back.out"
  | "elastic.out"
  | "bounce.out";

export type CharacterPosition = "left" | "center" | "right";

export interface CharacterDef {
  id: string;
  name: string;
  image: string;
  /** Visual scale on stage */
  size?: "sm" | "md" | "lg";
  /** Optional alternate expressions keyed by name */
  expressions?: Record<string, string>;
}

export interface SceneBackground {
  image?: string;
  color?: string;
  /** CSS gradient fallback */
  gradient?: string;
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
    | "bounce"
    | "shake"
    | "jump"
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
  style: "fade" | "wipe" | "flash";
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

export type Beat =
  | TitleBeat
  | DialogueBeat
  | ActionBeat
  | TransitionBeat
  | PauseBeat
  | PanelBeat;

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
