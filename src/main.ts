import "./style.css";
import * as PIXI from "pixi.js";
import * as AdaptiveScale from "adaptive-scale/lib-esm";
import { SCREEN_SIZE } from "./constants";
import { ScreenManager } from "./screens/screen";
import { LoadingScreen } from "./screens/loading";
import { Loader } from "pixi.js";
import { SoundLoader } from "@pixi/sound";

Loader.registerPlugin(SoundLoader);

const app = new PIXI.Application();
const container = document.getElementById("container") as HTMLElement;
app.resizeTo = container;
container.appendChild(app.view);

app.ticker.add(() => {
  const rect = AdaptiveScale.getScaledRect({
    container: {
      width: container.clientWidth,
      height: container.clientHeight,
    },
    target: SCREEN_SIZE,
    policy: AdaptiveScale.POLICY.ShowAll,
  });

  app.stage.x = rect.x;
  app.stage.y = rect.y;
  app.stage.scale.set(
    rect.width / SCREEN_SIZE.width,
    rect.height / SCREEN_SIZE.height
  );
});

if (import.meta.env.DEV) {
  import("spectorjs").then((SPECTOR) => {
    new SPECTOR.Spector().displayUI();
  });
}

const screenManager = new ScreenManager(app);

// Test Songs

// screenManager.loadScreen(new LoadingScreen(app, screenManager, 1020313, 2134868)); // Triangles (No elements, one .osu)
// screenManager.loadScreen(new LoadingScreen(app, screenManager, 606998, 1315750)); // Stars Align (Simple)
// screenManager.loadScreen(new LoadingScreen(app, screenManager, 11122, 1315750)); // Night Flight [Breeze] (no IDs in MetaData), unique bg per difficulty
screenManager.loadScreen(new LoadingScreen(app, screenManager, 1416017, 2921425)); // After School (mp4 video)
// screenManager.loadScreen(new LoadingScreen(app, screenManager, 36858, 120893)); // Senbonzakura (flv video)
// screenManager.loadScreen(new LoadingScreen(app, screenManager, 1041786, 2195668)); // Feel Special (avi video)
