import { CartoonPlayer } from "./engine/CartoonPlayer";
import { project } from "./project";

const player = new CartoonPlayer(project);

mustGet("play-btn").addEventListener("click", () => void player.play());
mustGet("pause-btn").addEventListener("click", () => player.pause());

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
