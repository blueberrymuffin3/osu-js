import { PathPoint, PathType, SliderPath, Vector2 } from "osu-classes";
import { Application, Container, Sprite } from "pixi.js";
import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
} from "../constants";
import { renderSliderPath } from "../render/sdf/signed_distance_field";
import { AbstractScreen, ScreenManager } from "./screen";

export class SDFTestScreen extends AbstractScreen {
  constructor(app: Application, manager: ScreenManager) {
    super(app, manager);

    // app.renderer.backgroundColor = 0x550055;

    const path = new SliderPath(
      undefined,
      [
        new PathPoint(new Vector2(0, 0), PathType.Bezier),
        new PathPoint(new Vector2(100, 0), undefined),
        new PathPoint(new Vector2(100, 100), PathType.Linear),
        new PathPoint(new Vector2(250, 100), PathType.Bezier),
        new PathPoint(new Vector2(300, 400), undefined),
        new PathPoint(new Vector2(200, 400), undefined),
        new PathPoint(new Vector2(0, 400), undefined),
      ],
      700
    ).path;

    // const path = new SliderPath(
    //   undefined,
    //   [
    //     new PathPoint(new Vector2(0, 0), PathType.Linear),
    //     new PathPoint(new Vector2(300, 100), PathType.Linear),
    //     new PathPoint(new Vector2(200, 300), PathType.Linear),
    //   ],
    //   700
    // ).path;

    const playArea = new Container();
    playArea.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    playArea.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.contianer.addChild(playArea);

    const canvas = renderSliderPath(path);
    setTimeout(() => {
      const sprite2 = Sprite.from(canvas);
      playArea.addChild(sprite2);
    }, 3000);
  }

  protected tick(): void {
    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.contianer
    );
  }
}
