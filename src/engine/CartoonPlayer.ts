import gsap from "gsap";
import type {
  ActionBeat,
  Beat,
  CartoonProject,
  CharacterDef,
  CharacterPosition,
  DialogueBeat,
  PanelBeat,
  Scene,
  TitleBeat,
  TransitionBeat,
} from "./types";

const POSITION_X: Record<CharacterPosition, string> = {
  left: "18%",
  center: "50%",
  right: "82%",
};

export class CartoonPlayer {
  private project: CartoonProject;
  private sceneIndex = 0;
  private beatIndex = 0;
  private playing = false;
  private paused = false;
  private timeline: gsap.core.Timeline | null = null;
  private characterElements = new Map<string, HTMLDivElement>();
  private resolveBeat: (() => void) | null = null;

  private readonly backgroundEl: HTMLElement;
  private readonly charactersEl: HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly dialogueBox: HTMLElement;
  private readonly speakerEl: HTMLElement;
  private readonly dialogueTextEl: HTMLElement;
  private readonly titleCard: HTMLElement;
  private readonly titleTextEl: HTMLElement;
  private readonly subtitleTextEl: HTMLElement;
  private readonly sceneLabel: HTMLElement;
  private readonly storyPanel: HTMLElement;
  private readonly storyPanelImg: HTMLImageElement;
  private readonly storyPanelCaption: HTMLElement;

  constructor(project: CartoonProject) {
    this.project = project;
    this.backgroundEl = mustGet("background");
    this.charactersEl = mustGet("characters");
    this.overlayEl = mustGet("overlay");
    this.dialogueBox = mustGet("dialogue-box");
    this.speakerEl = mustGet("speaker");
    this.dialogueTextEl = mustGet("dialogue-text");
    this.titleCard = mustGet("title-card");
    this.titleTextEl = mustGet("title-text");
    this.subtitleTextEl = mustGet("subtitle-text");
    this.sceneLabel = mustGet("scene-label");
    this.storyPanel = mustGet("story-panel");
    this.storyPanelImg = mustGet("story-panel-img") as HTMLImageElement;
    this.storyPanelCaption = mustGet("story-panel-caption");

    mustGet("next-btn").addEventListener("click", () => this.advanceBeat());
    mustGet("panel-next-btn").addEventListener("click", () => this.advanceBeat());
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (this.resolveBeat) {
          this.advanceBeat();
        } else if (!this.playing) {
          void this.play();
        }
      }
    });

    this.updateSceneLabel();
    this.syncStageToCurrentScene();
  }

  async play(): Promise<void> {
    if (this.playing && !this.paused) return;

    if (this.paused) {
      this.paused = false;
      this.timeline?.resume();
      this.setPlayState(true);
      return;
    }

    this.setPlayState(true);
    this.sceneIndex = 0;
    this.beatIndex = 0;

    for (; this.sceneIndex < this.project.scenes.length; this.sceneIndex++) {
      await this.playScene(this.project.scenes[this.sceneIndex]);
      if (this.paused) return;
    }

    this.setPlayState(false);
    this.paused = false;
    this.resetToOpening();
  }

  pause(): void {
    if (!this.playing) return;
    this.paused = true;
    this.timeline?.pause();
    this.setPlayState(false, true);
  }

  private async playScene(scene: Scene): Promise<void> {
    this.beatIndex = 0;
    this.updateSceneLabel();
    this.setupScene(scene);

    for (const beat of scene.beats) {
      if (this.paused) return;
      await this.playBeat(beat, scene);
      this.beatIndex++;
      this.updateSceneLabel();
    }
  }

  /** Keep the stage aligned with the current scene (and preview beat when idle). */
  private syncStageToCurrentScene(): void {
    const scene = this.project.scenes[this.sceneIndex];
    if (!scene) return;

    this.setupScene(scene);
    const beat = scene.beats[this.beatIndex];
    if (beat) this.showBeatPreview(beat);
    this.updateSceneLabel();
  }

  private resetToOpening(): void {
    this.sceneIndex = 0;
    this.beatIndex = 0;
    this.syncStageToCurrentScene();
  }

  private showBeatPreview(beat: Beat): void {
    if (beat.type !== "panel") return;

    this.storyPanelImg.src = beat.image;
    this.storyPanelCaption.textContent = beat.caption ?? "";
    this.storyPanelCaption.hidden = !beat.caption;
    this.storyPanel.hidden = false;
    gsap.set(this.storyPanel, { opacity: 1, scale: 1 });
  }

  private setupScene(scene: Scene): void {
    this.timeline?.kill();
    this.timeline = gsap.timeline();
    this.characterElements.clear();
    this.charactersEl.innerHTML = "";
    this.hideDialogue();
    this.hideTitle();
    this.hidePanel();

    const bg = scene.background;
    if (bg.image) {
      this.backgroundEl.style.backgroundImage = `url(${bg.image})`;
      this.backgroundEl.style.backgroundColor = "";
    } else if (bg.gradient) {
      this.backgroundEl.style.backgroundImage = bg.gradient;
      this.backgroundEl.style.backgroundColor = "";
    } else {
      this.backgroundEl.style.backgroundImage = "";
      this.backgroundEl.style.backgroundColor = bg.color ?? "#87CEEB";
    }

    const allCharacters = mergeCharacters(this.project.characters, scene.characters);
    for (const def of allCharacters) {
      this.createCharacterElement(def);
    }
  }

  private createCharacterElement(def: CharacterDef): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "character";
    if (def.size) wrapper.dataset.size = def.size;
    wrapper.dataset.id = def.id;
    wrapper.style.opacity = "0";

    const img = document.createElement("img");
    img.src = def.image;
    img.alt = def.name;
    img.draggable = false;
    wrapper.appendChild(img);

    this.charactersEl.appendChild(wrapper);
    this.characterElements.set(def.id, wrapper);
    return wrapper;
  }

  private async playBeat(beat: Beat, _scene: Scene): Promise<void> {
    switch (beat.type) {
      case "title":
        await this.playTitle(beat);
        break;
      case "dialogue":
        await this.playDialogue(beat);
        break;
      case "action":
        await this.playAction(beat);
        break;
      case "transition":
        await this.playTransition(beat);
        break;
      case "pause":
        await wait(beat.duration);
        break;
      case "panel":
        await this.playPanel(beat);
        break;
    }
  }

  private playTitle(beat: TitleBeat): Promise<void> {
    return new Promise((resolve) => {
      this.titleTextEl.textContent = beat.title;
      this.subtitleTextEl.textContent = beat.subtitle ?? "";
      this.subtitleTextEl.hidden = !beat.subtitle;
      this.titleCard.hidden = false;

      gsap.fromTo(
        this.titleCard,
        { opacity: 0, scale: 0.85 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out",
          onComplete: () => {
            gsap.to(this.titleCard, {
              opacity: 0,
              duration: 0.6,
              delay: (beat.duration ?? 2.5) - 0.6,
              onComplete: () => {
                this.titleCard.hidden = true;
                resolve();
              },
            });
          },
        }
      );
    });
  }

  private playPanel(beat: PanelBeat): Promise<void> {
    return new Promise((resolve) => {
      this.resolveBeat = resolve;
      this.storyPanelImg.src = beat.image;
      this.storyPanelCaption.textContent = beat.caption ?? "";
      this.storyPanelCaption.hidden = !beat.caption;
      this.storyPanel.hidden = false;

      gsap.fromTo(
        this.storyPanel,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
      );
    });
  }

  private playDialogue(beat: DialogueBeat): Promise<void> {
    return new Promise((resolve) => {
      this.resolveBeat = resolve;
      const name = beat.speaker ?? this.getCharacterName(beat.characterId);
      this.speakerEl.textContent = name ?? "";
      this.speakerEl.hidden = !name;
      this.dialogueTextEl.textContent = beat.text;
      this.dialogueBox.hidden = false;

      if (beat.focusCharacter) {
        this.highlightCharacter(beat.focusCharacter);
      }

      if (beat.characterId && beat.expression) {
        this.setExpression(beat.characterId, beat.expression);
      }

      gsap.fromTo(
        this.dialogueBox,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    });
  }

  private advanceBeat(): void {
    if (!this.resolveBeat) return;
    const done = this.resolveBeat;
    this.resolveBeat = null;

    if (!this.dialogueBox.hidden) {
      gsap.to(this.dialogueBox, {
        opacity: 0,
        y: 10,
        duration: 0.2,
        onComplete: () => {
          this.hideDialogue();
          done();
        },
      });
      return;
    }

    if (!this.storyPanel.hidden) {
      gsap.to(this.storyPanel, {
        opacity: 0,
        scale: 0.98,
        duration: 0.3,
        onComplete: () => {
          this.hidePanel();
          done();
        },
      });
    }
  }

  private playAction(beat: ActionBeat): Promise<void> {
    const el = this.characterElements.get(beat.characterId);
    if (!el) return Promise.resolve();

    const duration = beat.duration ?? 0.6;
    const delay = beat.delay ?? 0;

    return new Promise((resolve) => {
      const onDone = () => resolve();

      switch (beat.action) {
        case "enter": {
          const pos = beat.position ?? "center";
          gsap.set(el, { x: POSITION_X[pos], xPercent: -50, bottom: "8%" });
          gsap.fromTo(
            el,
            { opacity: 0, y: 80, scale: 0.6 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration,
              delay,
              ease: "back.out",
              onComplete: onDone,
            }
          );
          break;
        }
        case "exit":
          gsap.to(el, {
            opacity: 0,
            y: 60,
            scale: 0.7,
            duration,
            delay,
            ease: "power2.in",
            onComplete: onDone,
          });
          break;
        case "move": {
          const pos = beat.position ?? "center";
          gsap.to(el, {
            x: POSITION_X[pos],
            duration,
            delay,
            ease: "power2.inOut",
            onComplete: onDone,
          });
          break;
        }
        case "bounce":
          gsap.to(el, {
            y: -30,
            duration: duration / 2,
            delay,
            yoyo: true,
            repeat: 1,
            ease: "power2.out",
            onComplete: onDone,
          });
          break;
        case "shake":
          gsap.to(el, {
            x: "+=12",
            duration: 0.08,
            delay,
            yoyo: true,
            repeat: 5,
            ease: "power1.inOut",
            onComplete: onDone,
          });
          break;
        case "jump":
          gsap.to(el, {
            y: -50,
            duration: duration / 2,
            delay,
            yoyo: true,
            repeat: 1,
            ease: "power3.out",
            onComplete: onDone,
          });
          break;
        case "fadeIn":
          gsap.to(el, { opacity: 1, duration, delay, onComplete: onDone });
          break;
        case "fadeOut":
          gsap.to(el, { opacity: 0, duration, delay, onComplete: onDone });
          break;
        case "setExpression":
          if (beat.expression) this.setExpression(beat.characterId, beat.expression);
          wait(delay * 1000 + duration * 1000).then(onDone);
          break;
        default:
          onDone();
      }
    });
  }

  private playTransition(beat: TransitionBeat): Promise<void> {
    const duration = beat.duration ?? 0.8;
    return new Promise((resolve) => {
      if (beat.style === "fade") {
        gsap.to(this.overlayEl, {
          opacity: 1,
          duration: duration / 2,
          onComplete: () => {
            gsap.to(this.overlayEl, {
              opacity: 0,
              duration: duration / 2,
              onComplete: resolve,
            });
          },
        });
      } else if (beat.style === "wipe") {
        gsap.fromTo(
          this.overlayEl,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: duration / 2,
            ease: "power2.in",
            onComplete: () => {
              gsap.to(this.overlayEl, {
                scaleX: 0,
                transformOrigin: "right center",
                duration: duration / 2,
                ease: "power2.out",
                onComplete: resolve,
              });
            },
          }
        );
      } else {
        gsap.to(this.overlayEl, {
          opacity: 1,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          onComplete: resolve,
        });
      }
    });
  }

  private setExpression(characterId: string, expression: string): void {
    const def = findCharacter(this.project, characterId);
    const el = this.characterElements.get(characterId);
    if (!def?.expressions?.[expression] || !el) return;
    const img = el.querySelector("img");
    if (img) img.src = def.expressions[expression];
  }

  private highlightCharacter(characterId: string): void {
    for (const [id, el] of this.characterElements) {
      el.classList.toggle("talking", id === characterId);
    }
  }

  private getCharacterName(id?: string): string | undefined {
    if (!id) return undefined;
    return findCharacter(this.project, id)?.name;
  }

  private hideDialogue(): void {
    this.dialogueBox.hidden = true;
    for (const el of this.characterElements.values()) {
      el.classList.remove("talking");
    }
  }

  private hideTitle(): void {
    this.titleCard.hidden = true;
    gsap.set(this.titleCard, { opacity: 0 });
  }

  private hidePanel(): void {
    this.storyPanel.hidden = true;
    gsap.set(this.storyPanel, { opacity: 0 });
  }

  private setPlayState(playing: boolean, paused = false): void {
    this.playing = playing;
    const playBtn = mustGet("play-btn");
    const pauseBtn = mustGet("pause-btn");
    playBtn.hidden = playing && !paused;
    pauseBtn.hidden = !playing || paused;
  }

  private updateSceneLabel(): void {
    const total = this.project.scenes.length;
    const current = this.playing ? this.sceneIndex + 1 : 0;
    this.sceneLabel.textContent = `Scene ${current} / ${total}`;
    document.title = this.project.title;
  }
}

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeCharacters(
  global: CharacterDef[],
  scene?: CharacterDef[]
): CharacterDef[] {
  const map = new Map(global.map((c) => [c.id, c]));
  for (const c of scene ?? []) map.set(c.id, { ...map.get(c.id), ...c });
  return [...map.values()];
}

function findCharacter(project: CartoonProject, id: string): CharacterDef | undefined {
  for (const scene of project.scenes) {
    const found = scene.characters?.find((c) => c.id === id);
    if (found) return { ...project.characters.find((c) => c.id === id), ...found };
  }
  return project.characters.find((c) => c.id === id);
}
