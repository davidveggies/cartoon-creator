import { CartoonPlayer } from "./engine/CartoonPlayer";
import { CreatorUI } from "./creator/CreatorUI";
import { parseScreenplay } from "./creator/ScreenplayParser";
import { compileScreenplay, createEmptyProject } from "./creator/ScriptCompiler";

const player = new CartoonPlayer(createEmptyProject());

mustGet("restart-btn").addEventListener("click", () => player.playFromStart());
mustGet("play-btn").addEventListener("click", () => player.resume());
mustGet("pause-btn").addEventListener("click", () => player.pause());
mustGet("prev-scene-btn").addEventListener("click", () => player.previousScene());
mustGet("next-scene-btn").addEventListener("click", () => player.nextScene());
mustGet("sound-btn").addEventListener("click", () => player.toggleSound());
mustGet("record-btn").addEventListener("click", () => {
  void player.toggleVideoRecording();
});

player.syncControls();

document.addEventListener(
  "pointerdown",
  () => {
    player.unlockAudio();
  },
  { once: true }
);

const welcomeEl = mustGet("stage-welcome");

new CreatorUI(async (state, screenplayText) => {
  const parsed = parseScreenplay(screenplayText);
  const project = compileScreenplay({
    title: state.title,
    screenplay: parsed,
    cast: state.cast,
    defaultBackground: state.defaultBackground,
  });

  player.reloadProject(project);
  welcomeEl.hidden = true;
  player.playFromStart();
});

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
