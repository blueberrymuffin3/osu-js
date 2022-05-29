import "./style.css";
import * as PIXI from "pixi.js";
import * as AdaptiveScale from "adaptive-scale/lib-esm";
import { SCREEN_SIZE } from "./constants";
import { ScreenManager } from "./screens/screen";
import { LoadingScreen } from "./screens/loading";
import { Loader } from "pixi.js";
import { SoundLoader } from "@pixi/sound";
import { BeatmapLoader } from "./api/beatmap-loader";

Loader.registerPlugin(SoundLoader);
Loader.registerPlugin(BeatmapLoader);

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
screenManager.loadScreen(LoadingScreen);
