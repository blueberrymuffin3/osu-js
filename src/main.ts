import "./style.css";
import { Application, Loader, UPDATE_PRIORITY } from "pixi.js";
import * as PIXI from "pixi.js";
import { ScreenManager } from "./screens/screen";
import { LoadingScreen } from "./screens/loading";
import { SoundLoader } from "@pixi/sound";
import { BinaryFontLoader } from "./resources/fonts";

Loader.registerPlugin(SoundLoader);
Loader.registerPlugin(BinaryFontLoader);
(window as any).PIXI = PIXI; // For Pixi browser extension

const app = new Application({
  autoDensity: true,
  resolution: window.devicePixelRatio,
});
const container = document.getElementById("container") as HTMLElement;
app.resizeTo = container;
container.appendChild(app.view);

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

const screenManager = new ScreenManager();

// Test Songs

// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1011011, 2116202)); // new beginnings
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1020313, 2134868)); // Triangles (No elements, one .osu)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 606998, 1315750)); // Stars Align (Simple)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 11122, 1315750)); // Night Flight [Breeze] (no IDs in MetaData), unique bg per difficulty
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1416017, 2921425)); // After School (mp4 video)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 36858, 120893)); // Senbonzakura (flv video)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1041786, 2195668)); // Feel Special (avi video)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 921889, 1936122)); // Chikatto Chika Chika (TV Size) (mp4 video)
screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 759903, 1610972)); // Oedo Controller (feat. TORIENA) (Complex storyboard)

// screenManager.loadScreen(() => new SDFTestScreen(app, screenManager));
