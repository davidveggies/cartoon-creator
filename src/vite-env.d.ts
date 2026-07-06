/// <reference types="vite/client" />

interface Window {
  __cartoonFinished?: boolean;
}

interface CropTarget {
  readonly element: Element;
}

interface CropTargetConstructor {
  fromElement(element: Element): Promise<CropTarget>;
}

declare const CropTarget: CropTargetConstructor;

interface MediaStreamTrack {
  cropTo(target: CropTarget): Promise<void>;
}

declare module "virtual:story-panels" {
  import type { PanelBeat } from "./engine/types";

  export const storyPanelBeats: PanelBeat[];
}
