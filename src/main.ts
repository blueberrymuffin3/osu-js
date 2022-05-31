import "./style.css";
import { Application, Loader } from "pixi.js";
import * as PIXI from "pixi.js";
import { ScreenManager } from "./screens/screen";
import { LoadingScreen } from "./screens/loading";
import { SoundLoader } from "@pixi/sound";
// import { RenderTestScreen } from "./screens/render_test";

Loader.registerPlugin(SoundLoader);
(window as any).PIXI = PIXI

const app = new Application();
const container = document.getElementById("container") as HTMLElement;
app.resizeTo = container;
container.appendChild(app.view);

if (import.meta.env.DEV) {
  import("spectorjs").then((SPECTOR) => {
    new SPECTOR.Spector().displayUI();
  });
}

const screenManager = new ScreenManager();

// Test Songs

// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1011011, 2116202)); // new beginnings
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1020313, 2134868)); // Triangles (No elements, one .osu)
screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 606998, 1315750)); // Stars Align (Simple)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 11122, 1315750)); // Night Flight [Breeze] (no IDs in MetaData), unique bg per difficulty
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1416017, 2921425)); // After School (mp4 video)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 36858, 120893)); // Senbonzakura (flv video)
// screenManager.loadScreen(() => new LoadingScreen(app, screenManager, 1041786, 2195668)); // Feel Special (avi video)

// screenManager.loadScreen(() => new RenderTestScreen(app, screenManager));
// setTimeout(
//   () =>
//     screenManager.loadScreen(() => new RenderTestScreen(app, screenManager)),
//   1000
// );
