import "./style.css";
import * as PIXI from "pixi.js";
///<reference path="../node_modules/adaptive-scale/lib-esm/index.d.ts"/>
import * as AdaptiveScale from "adaptive-scale/lib-esm";
import { SCREEN_SIZE } from "./constants";
import { MenuScreen } from "./screens/menu";
import { ScreenManager } from "./screens/screen";
import { LoadingScreen } from "./screens/loading";
import { preloadTextures } from "./resources/textures";
import { preloadSounds } from "./resources/sounds";
import { Loader } from "pixi.js";
import { SoundLoader } from "@pixi/sound";

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

Loader.registerPlugin(SoundLoader);
app.loader.add(preloadTextures);
app.loader.add(preloadSounds);

const screenManager = new ScreenManager(app);
screenManager.loadScreen(LoadingScreen);

app.loader.load(() => screenManager.loadScreen(MenuScreen))
