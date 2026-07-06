import gsap from "gsap";
import { AudioDirector } from "./AudioDirector";
import { CartoonRecorder, downloadRecording } from "./CartoonRecorder";
import {
  DEFAULT_CAT_VOICE_ID,
  GROUP_SPEAKER_VOICES,
  resolveVoiceProfile,
} from "./catVoices";
import type {
  ActionBeat,
  Beat,
  CartoonProject,
  CharacterDef,
  CharacterPosition,
  CrowdBeat,
  DialogueBeat,
  MusicBeat,
  RainDogsBeat,
  Scene,
  SfxBeat,
  TitleBeat,
  TransitionBeat,
  WeatherBeat,
} from "./types";

const POSITION_X: Record<CharacterPosition, string> = {
  left: "14%",
  "inner-left": "32%",
  center: "50%",
  "inner-right": "68%",
  right: "86%",
};

const DEFAULT_CROWD_IMAGES = [
  "/assets/characters/kitten.svg",
  "/assets/characters/kitten-happy.svg",
  "/assets/characters/kitten-surprised.svg",
  "/assets/characters/kitten-profile.svg",
];

const GLOWING_DOG_IMAGE = "/assets/characters/glowing-dog.svg";
const RAIN_STREAK_COUNT = 72;

export class CartoonPlayer {
  private project: CartoonProject;
  private sceneIndex = 0;
  private beatIndex = 0;
  private playing = false;
  private paused = false;
  private timeline: gsap.core.Timeline | null = null;
  private characterElements = new Map<string, HTMLDivElement>();
  private groundLine = "8%";
  private runId = 0;
  private readonly audio = new AudioDirector();

  private stormIntervalId: number | null = null;
  private rainDogIntervalId: number | null = null;
  private readonly cartoonRecorder = new CartoonRecorder();
  private recordingVideo = false;
  private recordingBusy = false;

  private readonly backgroundEl: HTMLElement;
  private readonly weatherEl: HTMLElement;
  private readonly catCrowdEl: HTMLElement;
  private readonly charactersEl: HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly sceneViewportEl: HTMLElement;
  private readonly dialogueBox: HTMLElement;
  private readonly speakerEl: HTMLElement;
  private readonly dialogueTextEl: HTMLElement;
  private readonly titleCard: HTMLElement;
  private readonly titleTextEl: HTMLElement;
  private readonly subtitleTextEl: HTMLElement;
  private readonly sceneLabel: HTMLElement;
  private readonly sceneNameEl: HTMLElement;
  private readonly sceneSelect: HTMLSelectElement;

  constructor(project: CartoonProject) {
    this.project = project;
    this.backgroundEl = mustGet("background");
    this.weatherEl = mustGet("weather");
    this.catCrowdEl = mustGet("cat-crowd");
    this.charactersEl = mustGet("characters");
    this.overlayEl = mustGet("overlay");
    this.sceneViewportEl = mustGet("scene-viewport");
    this.dialogueBox = mustGet("dialogue-box");
    this.speakerEl = mustGet("speaker");
    this.dialogueTextEl = mustGet("dialogue-text");
    this.titleCard = mustGet("title-card");
    this.titleTextEl = mustGet("title-text");
    this.subtitleTextEl = mustGet("subtitle-text");
    this.sceneLabel = mustGet("scene-label");
    this.sceneNameEl = mustGet("scene-name");
    this.sceneSelect = mustGet("scene-select") as HTMLSelectElement;

    this.buildSceneSelect();
    this.sceneSelect.addEventListener("change", () => {
      const index = Number(this.sceneSelect.value);
      if (Number.isNaN(index) || index === this.sceneIndex) return;
      void this.goToScene(index, false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (this.playing && !this.paused) this.pause();
        else this.resume();
      }
    });

    this.cartoonRecorder.onCaptureEnded = () => {
      void this.endVideoRecording(false);
    };

    this.syncStageToCurrentScene();
    this.updateControlButtons();
  }

  /** Start the cartoon from the beginning. */
  playFromStart(): void {
    this.audio.unlock();
    window.__cartoonFinished = false;
    this.stopPlayback();
    this.sceneIndex = 0;
    this.beatIndex = 0;
    const scene = this.project.scenes[0];
    if (scene) this.setupScene(scene);
    this.updateSceneLabel();
    void this.runPlayback();
  }

  /** Continue playback, or start from the current scene if idle. */
  resume(): void {
    this.audio.unlock();
    if (this.playing && this.paused) {
      this.paused = false;
      gsap.globalTimeline.resume();
      this.audio.resumeSpeech();
      this.audio.resumeMusic();
      this.updateControlButtons();
      return;
    }
    if (!this.playing) {
      void this.runPlayback();
    }
  }

  async play(): Promise<void> {
    this.resume();
  }

  pause(): void {
    if (!this.playing || this.paused) return;
    this.paused = true;
    gsap.globalTimeline.pause();
    this.audio.pauseSpeech();
    this.audio.pauseMusic();
    this.updateControlButtons();
  }

  toggleSound(): boolean {
    this.audio.unlock();
    this.audio.setEnabled(!this.audio.isEnabled());
    this.updateControlButtons();
    return this.audio.isEnabled();
  }

  isSoundEnabled(): boolean {
    return this.audio.isEnabled();
  }

  isVideoRecording(): boolean {
    return this.recordingVideo;
  }

  async toggleVideoRecording(): Promise<void> {
    if (this.recordingVideo) {
      await this.endVideoRecording(true);
      return;
    }
    await this.startVideoRecording();
  }

  private async startVideoRecording(): Promise<void> {
    if (this.recordingVideo || this.recordingBusy) return;

    this.audio.unlock();
    this.recordingBusy = true;
    this.updateControlButtons();

    try {
      const audioStream = this.audio.startRecordingMix();
      await this.cartoonRecorder.start(this.sceneViewportEl, audioStream);
    } catch {
      this.recordingBusy = false;
      this.updateControlButtons();
      return;
    }

    this.recordingVideo = true;
    this.recordingBusy = false;
    this.playFromStart();
  }

  private async endVideoRecording(stopPlayback: boolean): Promise<void> {
    if (!this.recordingVideo && !this.cartoonRecorder.isRecording()) return;

    this.recordingVideo = false;
    this.recordingBusy = true;
    this.updateControlButtons();

    if (stopPlayback) this.stopPlayback();

    const blob = await this.cartoonRecorder.stop();
    this.audio.stopRecordingMix();
    this.recordingBusy = false;
    this.updateControlButtons();

    if (blob && blob.size > 0) {
      downloadRecording(blob, this.project.title);
    }
  }

  nextScene(): void {
    if (this.sceneIndex >= this.project.scenes.length - 1) return;
    void this.goToScene(this.sceneIndex + 1, false);
  }

  previousScene(): void {
    if (this.sceneIndex <= 0) return;
    void this.goToScene(this.sceneIndex - 1, false);
  }

  private stopPlayback(): void {
    this.runId++;
    this.playing = false;
    this.paused = false;
    this.stopAnimations();
    this.updateControlButtons();
  }

  private async goToScene(index: number, continuePlayback: boolean): Promise<void> {
    const forward = index > this.sceneIndex;
    this.stopPlayback();
    this.sceneIndex = index;
    this.beatIndex = 0;

    const scene = this.project.scenes[index];
    if (!scene) return;

    if (forward && index > 0) {
      await this.animateSceneChange(scene);
    } else {
      this.setupScene(scene);
    }

    this.updateSceneLabel();
    this.updateControlButtons();

    if (continuePlayback) {
      void this.runPlayback();
    }
  }

  private async runPlayback(): Promise<void> {
    const id = this.runId;
    this.playing = true;
    this.paused = false;
    this.updateControlButtons();

    for (; this.sceneIndex < this.project.scenes.length; this.sceneIndex++) {
      if (id !== this.runId) return;

      const scene = this.project.scenes[this.sceneIndex];
      if (this.beatIndex === 0 && this.sceneIndex > 0) {
        await this.animateSceneChange(scene);
        if (id !== this.runId) return;
      }

      await this.playScene(scene, id);
      if (id !== this.runId) return;

      this.beatIndex = 0;
    }

    if (id !== this.runId) return;
    this.playing = false;
    this.paused = false;
    window.__cartoonFinished = true;
    if (this.recordingVideo) {
      await this.endVideoRecording(false);
    }
    this.resetToOpening();
    this.updateControlButtons();
  }

  private async waitIfPaused(runId: number): Promise<void> {
    while (this.paused && this.playing && runId === this.runId) {
      await wait(50);
    }
  }

  private stopAnimations(): void {
    this.timeline?.kill();
    this.timeline = null;
    gsap.killTweensOf(this.sceneViewportEl);
    gsap.killTweensOf(this.dialogueBox);
    gsap.killTweensOf(this.overlayEl);
    gsap.killTweensOf(this.titleCard);
    gsap.killTweensOf(this.charactersEl.children);
    gsap.killTweensOf(this.catCrowdEl.querySelectorAll(".crowd-cat"));
    gsap.killTweensOf(this.weatherEl.querySelectorAll(".rain-dog"));
    this.clearWeather();
    gsap.globalTimeline.resume();
    this.audio.stopSpeech();
    this.audio.stopMusic(0);
    this.hideDialogue();
    this.hideTitle();
  }

  /** Reload project data and refresh the stage (used during dev edits). */
  reloadProject(project: CartoonProject): void {
    this.project = project;
    this.stopPlayback();
    this.sceneIndex = 0;
    this.beatIndex = 0;
    gsap.set(this.sceneViewportEl, { opacity: 1, scale: 1 });
    this.buildSceneSelect();
    this.syncStageToCurrentScene();
    this.syncControls();
  }

  /** Refresh control button states (call after wiring listeners). */
  syncControls(): void {
    this.updateControlButtons();
    this.updateSceneLabel();
  }

  private async playScene(scene: Scene, runId: number): Promise<void> {
    this.updateSceneLabel();

    for (; this.beatIndex < scene.beats.length; this.beatIndex++) {
      if (runId !== this.runId) return;
      await this.waitIfPaused(runId);
      if (runId !== this.runId) return;
      await this.playBeat(scene.beats[this.beatIndex], runId);
      this.updateSceneLabel();
    }

    if (runId === this.runId) {
      this.audio.stopMusic(1200);
    }
  }

  /** Keep the stage aligned with the current scene (and preview beat when idle). */
  private syncStageToCurrentScene(): void {
    const scene = this.project.scenes[this.sceneIndex];
    if (!scene) return;

    this.setupScene(scene);
    this.updateSceneLabel();
  }

  private resetToOpening(): void {
    this.sceneIndex = 0;
    this.beatIndex = 0;
    this.syncStageToCurrentScene();
  }

  private animateSceneChange(nextScene: Scene): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.sceneViewportEl, {
        opacity: 0,
        scale: 0.97,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          this.setupScene(nextScene);
          gsap.fromTo(
            this.sceneViewportEl,
            { opacity: 0, scale: 1.02 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.45,
              ease: "power2.out",
              onComplete: resolve,
            }
          );
        },
      });
    });
  }

  private setupScene(scene: Scene): void {
    this.timeline?.kill();
    this.timeline = gsap.timeline();
    this.characterElements.clear();
    this.charactersEl.innerHTML = "";
    this.clearCatCrowd();
    this.clearWeather();
    this.hideDialogue();
    this.hideTitle();

    const bg = scene.background;
    this.groundLine = bg.groundLine ?? "8%";
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
    wrapper.className = "character drawn";
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

  private async playBeat(beat: Beat, runId: number): Promise<void> {
    if (runId !== this.runId) return;

    switch (beat.type) {
      case "title":
        await this.playTitle(beat, runId);
        break;
      case "dialogue":
        await this.playDialogue(beat, runId);
        break;
      case "action":
        await this.playAction(beat);
        break;
      case "transition":
        await this.playTransition(beat);
        break;
      case "pause":
        await this.waitPausable(beat.duration, runId);
        break;
      case "crowd":
        await this.playCrowd(beat);
        break;
      case "sfx":
        await this.playSfxBeat(beat, runId);
        break;
      case "weather":
        await this.playWeather(beat, runId);
        break;
      case "rainDogs":
        await this.playRainDogs(beat, runId);
        break;
      case "music":
        this.playMusicBeat(beat);
        break;
    }
  }

  private playMusicBeat(beat: MusicBeat): void {
    this.audio.playMusic(beat.track, {
      loop: beat.loop,
      volume: beat.volume,
    });
  }

  private async playTitle(beat: TitleBeat, runId: number): Promise<void> {
    if (runId !== this.runId) return;

    this.audio.playSfx("title");
    const line = [beat.title, beat.subtitle].filter(Boolean).join(". ");
    void this.audio.speak(line, { role: "title" });

    this.titleTextEl.textContent = beat.title;
    this.subtitleTextEl.textContent = beat.subtitle ?? "";
    this.subtitleTextEl.hidden = !beat.subtitle;
    this.titleCard.hidden = false;

    await gsap.fromTo(
      this.titleCard,
      { opacity: 0, scale: 0.85 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "back.out",
      }
    );
    if (runId !== this.runId) return;

    const holdMs = Math.max(0, ((beat.duration ?? 2.5) - 0.6) * 1000);
    await this.waitPausable(holdMs, runId);
    if (runId !== this.runId) return;

    await gsap.to(this.titleCard, {
      opacity: 0,
      duration: 0.6,
    });
    this.titleCard.hidden = true;
  }

  private playCrowd(beat: CrowdBeat): Promise<void> {
    this.audio.playSfx("crowd");
    const images = beat.images?.length ? beat.images : DEFAULT_CROWD_IMAGES;
    const count = beat.count ?? 28;
    const duration = beat.duration ?? 2.2;

    this.clearCatCrowd();

    const cats: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const cat = document.createElement("div");
      cat.className =
        beat.style === "orange" ? "crowd-cat crowd-cat--orange" : "crowd-cat";
      const img = document.createElement("img");
      img.src = images[i % images.length];
      img.alt = "";
      img.draggable = false;
      cat.appendChild(img);

      const x = 4 + Math.random() * 92;
      const y = 18 + Math.random() * 52;
      const scale = 0.45 + Math.random() * 0.55;
      const delay = Math.random() * 0.8;

      cat.style.left = `${x}%`;
      cat.style.bottom = `${y}%`;
      cat.style.setProperty("--cat-scale", String(scale));
      cat.style.setProperty("--cat-delay", `${delay}s`);
      cat.style.opacity = "0";

      this.catCrowdEl.appendChild(cat);
      cats.push(cat);
    }

    return new Promise((resolve) => {
      const staggerEach = count > 80 ? 0.008 : 0.03;
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(cats, {
        opacity: 1,
        duration: 0.35,
        stagger: { each: staggerEach, from: "random" },
        ease: "power2.out",
      });
      tl.to(
        cats,
        {
          y: "+=6",
          duration: 0.45,
          stagger: { each: 0.02, from: "random" },
          yoyo: true,
          repeat: Math.ceil(duration / 0.9),
          ease: "sine.inOut",
        },
        0.1
      );
    });
  }

  private clearCatCrowd(): void {
    gsap.killTweensOf(this.catCrowdEl.querySelectorAll(".crowd-cat"));
    this.catCrowdEl.innerHTML = "";
  }

  private markCharacterOnStage(el: HTMLDivElement): void {
    el.classList.add("on-stage");
  }

  private async playDialogue(beat: DialogueBeat, runId: number): Promise<void> {
    if (runId !== this.runId) return;

    const minHoldSec = (beat.duration ?? dialogueHoldMs(beat.text)) / 1000;
    const isNarrator = !beat.speaker || beat.speaker === "Narrator";

    const name = beat.speaker ?? this.getCharacterName(beat.characterId);
    this.dialogueBox.classList.toggle("narrator", isNarrator);
    this.dialogueBox.classList.toggle("character-line", !isNarrator);

    if (isNarrator) {
      this.speakerEl.hidden = true;
      this.speakerEl.textContent = "";
    } else {
      this.speakerEl.textContent = name ?? "";
      this.speakerEl.hidden = !name;
    }

    this.dialogueTextEl.textContent = beat.text;
    this.dialogueBox.hidden = false;

    if (beat.focusCharacter) {
      this.highlightCharacter(beat.focusCharacter);
    }

    if (beat.characterId && beat.expression) {
      this.setExpression(beat.characterId, beat.expression);
    }

    const speechPromise = isNarrator
      ? this.audio.speak(beat.text, { role: "narrator" })
      : this.audio.speak(beat.text, {
          role: "character",
          voice: this.resolveDialogueVoice(beat),
        });

    await gsap.fromTo(
      this.dialogueBox,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    );

    await Promise.all([speechPromise, this.waitPausable(minHoldSec * 1000, runId)]);
    if (runId !== this.runId) return;

    await gsap.to(this.dialogueBox, {
      opacity: 0,
      y: -6,
      duration: 0.25,
      ease: "power2.in",
    });

    this.hideDialogue();
  }

  private async playSfxBeat(beat: SfxBeat, runId: number): Promise<void> {
    const repeat = beat.repeat ?? 1;
    const interval = beat.interval ?? 700;

    for (let i = 0; i < repeat; i++) {
      if (runId !== this.runId) return;
      this.audio.playSfx(beat.sfx);
      if (beat.sfx === "thunder") {
        await this.flashLightning();
      }
      if (i < repeat - 1) {
        await this.waitPausable(interval, runId);
      }
    }
  }

  private flashLightning(): Promise<void> {
    this.triggerLightningBolt();
    return new Promise((resolve) => {
      gsap.fromTo(
        this.overlayEl,
        { opacity: 0, backgroundColor: "rgba(255,255,255,0)" },
        {
          opacity: 1,
          backgroundColor: "rgba(255,255,255,0.85)",
          duration: 0.06,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.set(this.overlayEl, { opacity: 0, backgroundColor: "transparent" });
            resolve();
          },
        }
      );
    });
  }

  private async playWeather(beat: WeatherBeat, runId: number): Promise<void> {
    if (beat.effect === "clear") {
      this.clearWeather();
      return;
    }

    this.startThunderstorm();
    const holdSec = beat.duration ?? 0;
    if (holdSec > 0) {
      await this.waitPausable(holdSec * 1000, runId);
    }
  }

  private startThunderstorm(): void {
    if (this.weatherEl.classList.contains("storm-active")) return;

    this.weatherEl.classList.add("storm-active");
    this.weatherEl.innerHTML = "";

    const rainLayer = document.createElement("div");
    rainLayer.className = "rain-layer";
    for (let i = 0; i < RAIN_STREAK_COUNT; i++) {
      const streak = document.createElement("div");
      streak.className = "rain-streak";
      streak.style.left = `${Math.random() * 100}%`;
      streak.style.animationDuration = `${0.45 + Math.random() * 0.55}s`;
      streak.style.animationDelay = `${Math.random() * 1.2}s`;
      streak.style.opacity = String(0.35 + Math.random() * 0.45);
      rainLayer.appendChild(streak);
    }
    this.weatherEl.appendChild(rainLayer);

    const bolt = document.createElement("div");
    bolt.className = "lightning-bolt";
    bolt.innerHTML = `<svg viewBox="0 0 80 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M44 0 L28 72 L48 72 L34 160 L62 68 L42 68 Z" fill="#fff9c4" stroke="#ffe066" stroke-width="2"/>
    </svg>`;
    this.weatherEl.appendChild(bolt);

    gsap.to(this.backgroundEl, {
      filter: "brightness(0.72) saturate(0.85)",
      duration: 1.2,
      ease: "power2.inOut",
    });

    if (this.stormIntervalId !== null) {
      window.clearInterval(this.stormIntervalId);
    }

    this.stormIntervalId = window.setInterval(() => {
      if (Math.random() > 0.55) {
        this.audio.playSfx("thunder");
        void this.flashLightning();
      }
    }, 1400);
  }

  private triggerLightningBolt(): void {
    const bolt = this.weatherEl.querySelector(".lightning-bolt");
    if (!bolt) return;

    const el = bolt as HTMLElement;
    el.style.left = `${18 + Math.random() * 64}%`;
    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");
  }

  private clearWeather(): void {
    if (this.stormIntervalId !== null) {
      window.clearInterval(this.stormIntervalId);
      this.stormIntervalId = null;
    }
    if (this.rainDogIntervalId !== null) {
      window.clearInterval(this.rainDogIntervalId);
      this.rainDogIntervalId = null;
    }

    gsap.killTweensOf(this.weatherEl.querySelectorAll(".rain-dog"));
    this.weatherEl.classList.remove("storm-active");
    this.weatherEl.style.zIndex = "1";
    this.weatherEl.innerHTML = "";
    gsap.set(this.backgroundEl, { filter: "none" });
  }

  private async playRainDogs(beat: RainDogsBeat, runId: number): Promise<void> {
    const durationSec = beat.duration ?? 4.5;
    const count = beat.count ?? 28;
    const spawnEveryMs = Math.max(80, (durationSec * 1000) / count);
    let spawned = 0;

    this.weatherEl.style.zIndex = "4";

    const spawnDog = () => {
      if (spawned >= count) return;
      spawned++;

      const dog = document.createElement("div");
      dog.className = "rain-dog";
      const img = document.createElement("img");
      img.src = GLOWING_DOG_IMAGE;
      img.alt = "";
      img.draggable = false;
      dog.appendChild(img);

      const x = 6 + Math.random() * 88;
      const fallDuration = 1.4 + Math.random() * 1.1;
      const spin = (Math.random() - 0.5) * 360;
      dog.style.left = `${x}%`;

      this.weatherEl.appendChild(dog);

      gsap.fromTo(
        dog,
        { y: "-10%", rotation: spin, opacity: 0 },
        {
          y: "115%",
          rotation: spin + (Math.random() - 0.5) * 180,
          opacity: 1,
          duration: fallDuration,
          ease: "power1.in",
          onComplete: () => dog.remove(),
        }
      );
    };

    spawnDog();
    this.rainDogIntervalId = window.setInterval(spawnDog, spawnEveryMs);

    await this.waitPausable(durationSec * 1000, runId);

    if (this.rainDogIntervalId !== null) {
      window.clearInterval(this.rainDogIntervalId);
      this.rainDogIntervalId = null;
    }
  }

  private resolveDialogueVoice(beat: DialogueBeat) {
    const id = beat.focusCharacter ?? beat.characterId;
    if (id) {
      const def = findCharacter(this.project, id);
      if (def?.voice?.preset) {
        return resolveVoiceProfile(def.voice.preset, def.voice);
      }
    }

    if (beat.speaker) {
      const byName = this.project.characters.find((c) => c.name === beat.speaker);
      if (byName?.voice?.preset) {
        return resolveVoiceProfile(byName.voice.preset, byName.voice);
      }

      const groupPreset = GROUP_SPEAKER_VOICES[beat.speaker];
      if (groupPreset) {
        return resolveVoiceProfile(groupPreset);
      }
    }

    return resolveVoiceProfile(DEFAULT_CAT_VOICE_ID);
  }

  private playAction(beat: ActionBeat): Promise<void> {
    const el = this.characterElements.get(beat.characterId);
    if (!el) return Promise.resolve();

    this.playActionSfx(beat);

    const duration = beat.duration ?? 0.6;
    const delay = beat.delay ?? 0;

    return new Promise((resolve) => {
      const onDone = () => resolve();

      switch (beat.action) {
        case "enter": {
          const pos = beat.position ?? "center";
          gsap.set(el, { left: POSITION_X[pos], x: 0, xPercent: -50, bottom: this.groundLine });
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
              onComplete: () => {
                this.markCharacterOnStage(el);
                onDone();
              },
            }
          );
          break;
        }
        case "march": {
          const pos = beat.position ?? "center";
          const targetX = POSITION_X[pos];
          gsap.set(el, {
            left: targetX,
            x: 0,
            xPercent: -50,
            bottom: this.groundLine,
            opacity: 1,
            scale: 1,
            y: 100,
          });
          const marchTl = gsap.timeline({
            delay,
            onComplete: () => {
              this.markCharacterOnStage(el);
              onDone();
            },
          });
          marchTl.to(el, {
            y: 0,
            duration: duration * 1.2,
            ease: "power2.out",
          });
          marchTl.to(
            el,
            {
              x: "+=5",
              duration: 0.14,
              yoyo: true,
              repeat: Math.round(duration * 4),
              ease: "sine.inOut",
            },
            0
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
            left: POSITION_X[pos],
            x: 0,
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
        case "dance": {
          const danceTl = gsap.timeline({
            delay,
            onComplete: onDone,
          });
          const step = duration / 8;
          danceTl.to(el, {
            x: "+=12",
            y: -22,
            rotation: 8,
            duration: step,
            ease: "sine.inOut",
          });
          danceTl.to(el, {
            x: "-=24",
            y: 0,
            rotation: -8,
            duration: step * 2,
            ease: "sine.inOut",
          });
          danceTl.to(el, {
            x: "+=12",
            y: -22,
            rotation: 8,
            duration: step,
            ease: "sine.inOut",
          });
          danceTl.to(el, {
            x: 0,
            y: 0,
            rotation: 0,
            duration: step * 2,
            ease: "power2.out",
          });
          danceTl.to(el, {
            x: "+=12",
            y: -18,
            rotation: 6,
            duration: step,
            ease: "sine.inOut",
          });
          danceTl.to(el, {
            x: "-=24",
            y: 0,
            rotation: -6,
            duration: step * 2,
            ease: "sine.inOut",
          });
          danceTl.to(el, {
            x: "+=12",
            y: 0,
            rotation: 0,
            duration: step,
            ease: "sine.inOut",
          });
          break;
        }
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

  private playActionSfx(beat: ActionBeat): void {
    const delayMs = (beat.delay ?? 0) * 1000;

    if (beat.action === "enter" && beat.characterId === "car") {
      window.setTimeout(() => this.audio.playSfx("screech"), delayMs);
      window.setTimeout(() => this.audio.playSfx("carStop"), delayMs + 2400);
      return;
    }

    if (beat.action === "shake" && beat.characterId === "car") {
      return;
    }

    if (beat.action === "jump" || beat.action === "bounce" || beat.action === "dance") {
      window.setTimeout(() => this.audio.playSfx("boing"), delayMs);
      return;
    }

    if (beat.action === "march") {
      window.setTimeout(() => this.audio.playSfx("meow"), delayMs + 150);
    }
  }

  private playTransition(beat: TransitionBeat): Promise<void> {
    this.audio.playSfx("whoosh");
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
      } else if (beat.style === "flash") {
        gsap.to(this.overlayEl, {
          opacity: 1,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          onComplete: resolve,
        });
      } else {
        resolve();
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
    this.dialogueBox.classList.remove("narrator", "character-line");
    for (const el of this.characterElements.values()) {
      el.classList.remove("talking");
    }
  }

  private hideTitle(): void {
    this.titleCard.hidden = true;
    gsap.set(this.titleCard, { opacity: 0 });
  }

  unlockAudio(): void {
    this.audio.unlock();
  }

  private async waitPausable(ms: number, runId: number): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (runId !== this.runId) return;
      await this.waitIfPaused(runId);
      await wait(Math.min(50, Math.max(0, end - Date.now())));
    }
  }

  private buildSceneSelect(): void {
    this.sceneSelect.innerHTML = "";
    this.project.scenes.forEach((scene, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = scene.title;
      this.sceneSelect.appendChild(option);
    });
    this.sceneSelect.value = String(this.sceneIndex);
  }

  private updateControlButtons(): void {
    const restartBtn = mustGet("restart-btn") as HTMLButtonElement;
    const playBtn = mustGet("play-btn") as HTMLButtonElement;
    const pauseBtn = mustGet("pause-btn") as HTMLButtonElement;
    const prevBtn = mustGet("prev-scene-btn") as HTMLButtonElement;
    const nextBtn = mustGet("next-scene-btn") as HTMLButtonElement;
    const soundBtn = mustGet("sound-btn") as HTMLButtonElement;
    const recordBtn = mustGet("record-btn") as HTMLButtonElement;

    const isPlaying = this.playing && !this.paused;
    const prevScene = this.project.scenes[this.sceneIndex - 1];
    const nextScene = this.project.scenes[this.sceneIndex + 1];
    const lockNav = this.recordingVideo || this.recordingBusy;

    pauseBtn.disabled = !isPlaying;
    playBtn.disabled = isPlaying;
    playBtn.textContent = this.paused ? "▶ Resume" : "▶ Play";

    prevBtn.disabled = lockNav || this.sceneIndex <= 0;
    nextBtn.disabled = lockNav || this.sceneIndex >= this.project.scenes.length - 1;
    prevBtn.textContent = prevScene ? `◀ ${prevScene.title}` : "◀ Prev scene";
    nextBtn.textContent = nextScene ? `${nextScene.title} ▶` : "Next scene ▶";

    soundBtn.textContent = this.audio.isEnabled() ? "🔊 Sound on" : "🔇 Sound off";
    soundBtn.setAttribute("aria-pressed", String(this.audio.isEnabled()));

    recordBtn.disabled = this.recordingBusy;
    recordBtn.classList.toggle("recording", this.recordingVideo);
    if (this.recordingBusy) {
      recordBtn.textContent = "⏺ Preparing…";
    } else if (this.recordingVideo) {
      recordBtn.textContent = "⏹ Stop & save";
    } else {
      recordBtn.textContent = "⏺ Record video";
    }

    restartBtn.disabled = lockNav;
    this.sceneSelect.disabled = lockNav;
  }

  private updateSceneLabel(): void {
    const total = this.project.scenes.length;
    const scene = this.project.scenes[this.sceneIndex];
    const sceneNum = this.sceneIndex + 1;
    const title = scene?.title ?? this.project.title;

    if (this.sceneSelect.value !== String(this.sceneIndex)) {
      this.sceneSelect.value = String(this.sceneIndex);
    }

    this.sceneNameEl.textContent = title;

    if (this.playing) {
      const beatNum = Math.min(this.beatIndex + 1, scene?.beats.length ?? 0);
      const beatTotal = scene?.beats.length ?? 0;
      this.sceneLabel.textContent = `beat ${beatNum} / ${beatTotal} · scene ${sceneNum} of ${total}`;
    } else {
      this.sceneLabel.textContent = `scene ${sceneNum} of ${total}`;
    }

    document.title = `${title} · ${this.project.title}`;
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

/** Reading pace for on-screen dialogue (~TV subtitle timing). */
function dialogueHoldMs(text: string): number {
  const msPerChar = 52;
  const min = 2400;
  const max = 9000;
  return Math.min(max, Math.max(min, text.length * msPerChar + 900));
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
