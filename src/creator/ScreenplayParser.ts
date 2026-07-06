export interface ParsedLine {
  kind: "dialogue";
  speaker: string;
  text: string;
}

export interface ParsedDirective {
  kind: "directive";
  raw: string;
  action: "enter" | "exit" | "shake" | "bounce" | "jump";
  character: string;
  position?: "left" | "inner-left" | "center" | "inner-right" | "right";
}

export interface ParsedScene {
  title: string;
  backgroundHint?: string;
  items: Array<ParsedLine | ParsedDirective>;
}

export interface ParsedScreenplay {
  scenes: ParsedScreenplayScene[];
}

export interface ParsedScreenplayScene {
  title: string;
  backgroundHint?: string;
  lines: ParsedLine[];
  directives: ParsedDirective[];
}

const DIALOGUE_RE = /^\s*([A-Za-z][A-Za-z0-9\s']*?)\s*:\s*(.+)\s*$/;
const SCENE_DASH_RE = /^\s*---+\s*(?:Scene\s*:\s*)?(.+?)\s*---+\s*$/i;
const SCENE_HASH_RE = /^\s*##\s+(.+?)\s*$/;
const DIRECTIVE_RE = /^\s*\[(.+?)\]\s*$/;

const ENTER_RE = /^enter\s+(.+?)\s+(left|inner-left|center|inner-right|right)$/i;
const EXIT_RE = /^exit\s+(.+)$/i;
const SHAKE_RE = /^(.+?)\s+shakes?$/i;
const BOUNCE_RE = /^(.+?)\s+bounces?$/i;
const JUMP_RE = /^(.+?)\s+jumps?$/i;

/** True when most non-empty lines look like SPEAKER: dialogue. */
export function isScreenplayFormat(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const dialogueLines = lines.filter((l) => DIALOGUE_RE.test(l) && !l.startsWith("["));
  return dialogueLines.length >= 1 && dialogueLines.length / lines.length >= 0.4;
}

export function parseScreenplay(text: string): ParsedScreenplay {
  const scenes: ParsedScreenplayScene[] = [];
  let current: ParsedScreenplayScene = newScene("Scene 1");

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const dashScene = line.match(SCENE_DASH_RE);
    if (dashScene) {
      if (current.lines.length > 0 || current.directives.length > 0) {
        scenes.push(current);
      }
      current = newScene(dashScene[1]!.trim());
      continue;
    }

    const hashScene = line.match(SCENE_HASH_RE);
    if (hashScene) {
      if (current.lines.length > 0 || current.directives.length > 0) {
        scenes.push(current);
      }
      current = newScene(hashScene[1]!.trim());
      continue;
    }

    const bgHint = line.match(/^\s*background\s*:\s*(.+)$/i);
    if (bgHint) {
      current.backgroundHint = bgHint[1]!.trim();
      continue;
    }

    const directiveMatch = line.match(DIRECTIVE_RE);
    if (directiveMatch) {
      const parsed = parseDirective(directiveMatch[1]!.trim());
      if (parsed) current.directives.push(parsed);
      continue;
    }

    const dialogueMatch = line.match(DIALOGUE_RE);
    if (dialogueMatch) {
      current.lines.push({
        kind: "dialogue",
        speaker: dialogueMatch[1]!.trim(),
        text: dialogueMatch[2]!.trim(),
      });
    }
  }

  if (current.lines.length > 0 || current.directives.length > 0) {
    scenes.push(current);
  }

  if (scenes.length === 0) {
    throw new Error("No dialogue found. Use lines like TONY: Hello there!");
  }

  return { scenes };
}

function newScene(title: string): ParsedScreenplayScene {
  return { title, lines: [], directives: [] };
}

function parseDirective(inner: string): ParsedDirective | null {
  const enter = inner.match(ENTER_RE);
  if (enter) {
    return {
      kind: "directive",
      raw: inner,
      action: "enter",
      character: enter[1]!.trim(),
      position: enter[2]!.toLowerCase() as ParsedDirective["position"],
    };
  }

  const exit = inner.match(EXIT_RE);
  if (exit) {
    return {
      kind: "directive",
      raw: inner,
      action: "exit",
      character: exit[1]!.trim(),
    };
  }

  const shake = inner.match(SHAKE_RE);
  if (shake) {
    return { kind: "directive", raw: inner, action: "shake", character: shake[1]!.trim() };
  }

  const bounce = inner.match(BOUNCE_RE);
  if (bounce) {
    return { kind: "directive", raw: inner, action: "bounce", character: bounce[1]!.trim() };
  }

  const jump = inner.match(JUMP_RE);
  if (jump) {
    return { kind: "directive", raw: inner, action: "jump", character: jump[1]!.trim() };
  }

  console.warn(`Unknown stage direction: [${inner}]`);
  return null;
}
