import "./style.scss";
import {
  Application,
  ENV,
  ExtensionFormatLoose,
  extensions,
  ExtensionType,
  settings,
  UPDATE_PRIORITY,
} from "pixi.js";
import * as PIXI from "pixi.js";
import { BinaryFontLoader } from "./resources/fonts";
import { executeSteps, LoadCallback } from "./loader/executor";
import { loadResourcesStep } from "./loader/resource-loader";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { StandardGame } from "./game/standard_game";
import { LoadedBeatmap } from "./loader/util";
import { loadBeatmapStep } from "./loader/beatmap-loader";

extensions.add(<ExtensionFormatLoose>{
  type: ExtensionType.Loader,
  ref: BinaryFontLoader,
});
(window as any).PIXI = PIXI; // For Pixi browser extension

settings.PREFER_ENV = ENV.WEBGL2;

const app = new Application({
  autoDensity: true,
  resolution: window.devicePixelRatio,
});

let loadedBeatmap: LoadedBeatmap;

export const load = (cb: LoadCallback, info: BeatmapInfo) =>
  executeSteps(cb, [
    {
      weight: 0.5,
      async execute(_cb) {
        /* Download App */
      },
    },
    {
      weight: 1,
      execute: loadResourcesStep(app),
    },
    {
      weight: 10,
      execute: loadBeatmapStep(info, (beatmap) => (loadedBeatmap = beatmap)),
    },
  ]);

export async function start(container: HTMLElement) {
  if (import.meta.env.DEV) {
    // await import("spectorjs").then((SPECTOR) => {
    //   const style = document.createElement("style");
    //   style.innerText = `
    //   .captureMenuComponent, .captureMenuLogComponent {
    //     margin-left: 0 !important;
    //     left: 5px !important;
    //   }
    //   `;
    //   document.head.appendChild(style);

    //   new SPECTOR.Spector().displayUI();
    // });

    await import("pixi-stats").then(({ addStats }) => {
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

  app.resizeTo = container;
  container.appendChild(app.view);
  app.stage.addChild(new StandardGame(app, loadedBeatmap));
}
