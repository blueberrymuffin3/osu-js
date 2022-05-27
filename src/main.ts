import "./style.css";
import * as PIXI from "pixi.js";
///<reference path="../node_modules/adaptive-scale/lib-esm/index.d.ts"/>
import * as AdaptiveScale from "adaptive-scale/lib-esm";
import { SCREEN_SIZE } from "./constants";
import { MenuScreen } from "./screens/menu";

const app = new PIXI.Application();
const container = document.getElementById("container") as HTMLElement;
app.resizeTo = container;
container.appendChild(app.view);

app.ticker.add(function adaptiveScaling() {
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

new MenuScreen(app);
