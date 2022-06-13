import "./style.scss";
import { Application, Loader, UPDATE_PRIORITY } from "pixi.js";
import * as PIXI from "pixi.js";
import { ScreenManager } from "./screens/screen";
import { SoundLoader } from "@pixi/sound";
import { BinaryFontLoader } from "./resources/fonts";
import {
  executeSteps,
  LoadCallback,
  loadResources as loadResourcesStep,
} from "./loader";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { loadBeatmapStep, LoadedBeatmap } from "./api/beatmap-loader";
import { StandardGameScreen } from "./screens/standard_game";

Loader.registerPlugin(SoundLoader);
Loader.registerPlugin(BinaryFontLoader);
(window as any).PIXI = PIXI; // For Pixi browser extension

const app = new Application({
  autoDensity: true,
  resolution: window.devicePixelRatio,
});

const screenManager = new ScreenManager();

let setLoadedBeatmap: (loadedBeatmap: LoadedBeatmap) => void;
let loadedBeatmap = new Promise<LoadedBeatmap>((resolve) => {
  setLoadedBeatmap = resolve;
});

export const load = (cb: LoadCallback, info: BeatmapInfo) =>
  executeSteps(cb, [
    {
      weight: 0.2,
      async execute(_cb) {
        /* Download App */
      },
    },
    {
      weight: 1,
      execute: loadResourcesStep(app),
    },
    {
      weight: 5,
      execute: loadBeatmapStep(info, setLoadedBeatmap),
    },
  ]);

export function start(container: HTMLElement) {
  app.resizeTo = container;
  container.appendChild(app.view);
  loadedBeatmap.then((loadedBeatmap) => {
    screenManager.loadScreen(
      () => new StandardGameScreen(app, screenManager, loadedBeatmap)
    );
  });

  if (import.meta.env.DEV) {
    import("spectorjs").then((SPECTOR) => {
      const style = document.createElement("style");
      style.innerText = `
      .captureMenuComponent, .captureMenuLogComponent {
        margin-left: 0 !important;
        left: 5px !important;
      }
      `;
      document.head.appendChild(style);

      new SPECTOR.Spector().displayUI();
    });

    import("pixi-stats").then(({ addStats }) => {
      const style = document.createElement("style");
      style.innerText = `
      div#stats {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 500;
        width: max(200px, 10vw, 10vh);
        height: max(100px, 6vh, 6vw);
        opacity: 0.8;
        user-select: none;
      }
      
      div#stats canvas {
        display: block !important;
      }
      `;
      document.head.appendChild(style);

      const stats = addStats(document, app);
      app.ticker.add(stats.update, stats, UPDATE_PRIORITY.UTILITY);
    });
  }
}
