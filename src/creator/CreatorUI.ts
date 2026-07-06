import { CAT_VOICE_PRESETS } from "../engine/catVoices";
import { galleryByCategory, type GalleryAsset } from "./assetCatalog";
import { ideaToScreenplay } from "./IdeaToScript";
import { isScreenplayFormat, parseScreenplay } from "./ScreenplayParser";
import type { CastMember } from "./ScriptCompiler";
import type { SceneBackground } from "../engine/types";

export type ScriptMode = "screenplay" | "idea";

export interface CreatorState {
  title: string;
  scriptMode: ScriptMode;
  scriptText: string;
  cast: CastMember[];
  defaultBackground: SceneBackground;
}

type GalleryTarget =
  | { kind: "cast"; castId: string }
  | { kind: "background" };

export class CreatorUI {
  private state: CreatorState;
  private galleryTarget: GalleryTarget | null = null;

  private readonly onCompile: (state: CreatorState, screenplayText: string) => void | Promise<void>;

  private readonly titleInput: HTMLInputElement;
  private readonly modeScreenplayBtn: HTMLButtonElement;
  private readonly modeIdeaBtn: HTMLButtonElement;
  private readonly scriptLabel: HTMLLabelElement;
  private readonly scriptArea: HTMLTextAreaElement;
  private readonly castList: HTMLElement;
  private readonly addCastBtn: HTMLButtonElement;
  private readonly bgPreview: HTMLElement;
  private readonly pickBgBtn: HTMLButtonElement;
  private readonly makeBtn: HTMLButtonElement;
  private readonly errorEl: HTMLElement;
  private readonly galleryModal: HTMLElement;
  private readonly galleryGrid: HTMLElement;
  private readonly galleryCloseBtn: HTMLButtonElement;

  constructor(onCompile: (state: CreatorState, screenplayText: string) => void | Promise<void>) {
    this.onCompile = onCompile;
    this.state = {
      title: "My Cartoon",
      scriptMode: "screenplay",
      scriptText: DEFAULT_SCREENPLAY_TEMPLATE,
      cast: [defaultCastMember("Hero"), defaultCastMember("Friend")],
      defaultBackground: {
        image: "/assets/backgrounds/city.svg",
        groundLine: "16%",
      },
    };

    this.titleInput = mustGet("cartoon-title") as HTMLInputElement;
    this.modeScreenplayBtn = mustGet("mode-screenplay") as HTMLButtonElement;
    this.modeIdeaBtn = mustGet("mode-idea") as HTMLButtonElement;
    this.scriptLabel = mustGet("script-label") as HTMLLabelElement;
    this.scriptArea = mustGet("script-input") as HTMLTextAreaElement;
    this.castList = mustGet("cast-list");
    this.addCastBtn = mustGet("add-cast-btn") as HTMLButtonElement;
    this.bgPreview = mustGet("bg-preview");
    this.pickBgBtn = mustGet("pick-bg-btn") as HTMLButtonElement;
    this.makeBtn = mustGet("make-cartoon-btn") as HTMLButtonElement;
    this.errorEl = mustGet("creator-error");
    this.galleryModal = mustGet("gallery-modal");
    this.galleryGrid = mustGet("gallery-grid");
    this.galleryCloseBtn = mustGet("gallery-close") as HTMLButtonElement;

    this.bindEvents();
    this.syncFromState();
  }

  private bindEvents(): void {
    this.titleInput.addEventListener("input", () => {
      this.state.title = this.titleInput.value.trim() || "My Cartoon";
    });

    this.modeScreenplayBtn.addEventListener("click", () => this.setScriptMode("screenplay"));
    this.modeIdeaBtn.addEventListener("click", () => this.setScriptMode("idea"));

    this.scriptArea.addEventListener("input", () => {
      this.state.scriptText = this.scriptArea.value;
      this.clearError();
    });

    this.addCastBtn.addEventListener("click", () => {
      this.state.cast.push(defaultCastMember(`Character ${this.state.cast.length + 1}`));
      this.renderCast();
    });

    this.pickBgBtn.addEventListener("click", () => this.openGallery({ kind: "background" }));

    this.makeBtn.addEventListener("click", () => void this.handleMakeCartoon());

    this.galleryCloseBtn.addEventListener("click", () => this.closeGallery());
    this.galleryModal.addEventListener("click", (e) => {
      if (e.target === this.galleryModal) this.closeGallery();
    });

    mustGet("load-template-btn").addEventListener("click", () => {
      this.state.scriptText = DEFAULT_SCREENPLAY_TEMPLATE;
      this.setScriptMode("screenplay");
      this.syncFromState();
    });
  }

  private setScriptMode(mode: ScriptMode): void {
    this.state.scriptMode = mode;
    this.modeScreenplayBtn.classList.toggle("active", mode === "screenplay");
    this.modeIdeaBtn.classList.toggle("active", mode === "idea");
    this.scriptLabel.textContent =
      mode === "screenplay" ? "Screenplay" : "Story idea";
    this.scriptArea.placeholder =
      mode === "screenplay"
        ? "TONY: Why are you threatening me?\nSAL: Because you have a shovel."
        : "A kitten and a dog meet in the city and become best friends…";
    if (mode === "idea" && this.state.scriptText === DEFAULT_SCREENPLAY_TEMPLATE) {
      this.state.scriptText = "";
    }
    this.scriptArea.value = this.state.scriptText;
  }

  private syncFromState(): void {
    this.titleInput.value = this.state.title;
    this.scriptArea.value = this.state.scriptText;
    this.setScriptMode(this.state.scriptMode);
    this.renderCast();
    this.renderBackgroundPreview();
  }

  private renderCast(): void {
    this.castList.replaceChildren();
    for (const member of this.state.cast) {
      this.castList.appendChild(this.buildCastRow(member));
    }
  }

  private buildCastRow(member: CastMember): HTMLElement {
    const row = document.createElement("div");
    row.className = "cast-row";
    row.dataset.castId = member.id;

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "cast-thumb";
    thumb.title = "Pick image";
    if (member.image) {
      const img = document.createElement("img");
      img.src = member.image;
      img.alt = member.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = "+";
    }
    thumb.addEventListener("click", () => this.openGallery({ kind: "cast", castId: member.id }));

    const upload = document.createElement("input");
    upload.type = "file";
    upload.accept = "image/png,image/jpeg,image/svg+xml,image/webp";
    upload.hidden = true;
    upload.addEventListener("change", () => {
      const file = upload.files?.[0];
      if (!file) return;
      member.image = URL.createObjectURL(file);
      this.renderCast();
    });

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "secondary small";
    uploadBtn.textContent = "Upload";
    uploadBtn.addEventListener("click", () => upload.click());

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "cast-name";
    nameInput.value = member.name;
    nameInput.placeholder = "Character name";
    nameInput.addEventListener("input", () => {
      member.name = nameInput.value.trim() || member.name;
    });

    const voiceSelect = document.createElement("select");
    voiceSelect.className = "cast-voice";
    for (const preset of CAT_VOICE_PRESETS) {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.label;
      voiceSelect.appendChild(opt);
    }
    voiceSelect.value = member.voicePreset ?? "tiny-tabby";
    voiceSelect.addEventListener("change", () => {
      member.voicePreset = voiceSelect.value;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "secondary small";
    removeBtn.textContent = "Remove";
    removeBtn.disabled = this.state.cast.length <= 1;
    removeBtn.addEventListener("click", () => {
      this.state.cast = this.state.cast.filter((c) => c.id !== member.id);
      this.renderCast();
    });

    const actions = document.createElement("div");
    actions.className = "cast-actions";
    actions.append(uploadBtn, removeBtn);

    row.append(thumb, nameInput, voiceSelect, actions);
    return row;
  }

  private renderBackgroundPreview(): void {
    this.bgPreview.replaceChildren();
    const bg = this.state.defaultBackground;
    if (bg.image) {
      const img = document.createElement("img");
      img.src = bg.image;
      img.alt = "Background";
      this.bgPreview.appendChild(img);
    } else if (bg.gradient) {
      this.bgPreview.style.background = bg.gradient;
    } else if (bg.color) {
      this.bgPreview.style.background = bg.color;
    }
  }

  private openGallery(target: GalleryTarget): void {
    this.galleryTarget = target;
    const category = target.kind === "background" ? "background" : "character";
    this.galleryGrid.replaceChildren();

    for (const asset of galleryByCategory(category)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-item";
      const img = document.createElement("img");
      img.src = asset.path;
      img.alt = asset.label;
      const label = document.createElement("span");
      label.textContent = asset.label;
      btn.append(img, label);
      btn.addEventListener("click", () => this.selectGalleryAsset(asset));
      this.galleryGrid.appendChild(btn);
    }

    this.galleryModal.hidden = false;
  }

  private selectGalleryAsset(asset: GalleryAsset): void {
    if (!this.galleryTarget) return;

    if (this.galleryTarget.kind === "background") {
      this.state.defaultBackground = { image: asset.path, groundLine: "16%" };
      this.renderBackgroundPreview();
    } else {
      const target = this.galleryTarget;
      const member = this.state.cast.find((c) => c.id === target.castId);
      if (member) {
        member.image = asset.path;
        this.renderCast();
      }
    }

    this.closeGallery();
  }

  private closeGallery(): void {
    this.galleryModal.hidden = true;
    this.galleryTarget = null;
  }

  private async handleMakeCartoon(): Promise<void> {
    this.clearError();
    this.makeBtn.disabled = true;
    this.makeBtn.textContent = "Working…";

    try {
      this.state.title = this.titleInput.value.trim() || "My Cartoon";
      this.state.scriptText = this.scriptArea.value.trim();

      if (!this.state.scriptText) {
        throw new Error("Write a screenplay or story idea first.");
      }

      let screenplayText = this.state.scriptText;

      if (this.state.scriptMode === "idea" || !isScreenplayFormat(screenplayText)) {
        screenplayText = await ideaToScreenplay({
          idea: this.state.scriptText,
          cast: this.state.cast.map((c) => ({ name: c.name })),
        });
        this.state.scriptText = screenplayText;
        this.state.scriptMode = "screenplay";
        this.scriptArea.value = screenplayText;
        this.setScriptMode("screenplay");
      }

      parseScreenplay(screenplayText);
      await this.onCompile(this.state, screenplayText);
    } catch (err) {
      this.showError(err instanceof Error ? err.message : String(err));
    } finally {
      this.makeBtn.disabled = false;
      this.makeBtn.textContent = "Make Cartoon";
    }
  }

  private showError(message: string): void {
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }

  private clearError(): void {
    this.errorEl.hidden = true;
    this.errorEl.textContent = "";
  }
}

function defaultCastMember(name: string): CastMember {
  return {
    id: `char-${Math.random().toString(36).slice(2, 9)}`,
    name,
    image: "",
    voicePreset: "tiny-tabby",
  };
}

const DEFAULT_SCREENPLAY_TEMPLATE = `--- Scene: Opening ---
background: city

Narrator: Once upon a time, two friends met in the big city.

[enter Hero inner-left]
[enter Friend inner-right]

Hero: Why are you threatening me?
Friend: Because you have a shovel.

Hero: That is the worst reason I have ever heard!
Friend: Wait until you see what I build with it.
`;

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
