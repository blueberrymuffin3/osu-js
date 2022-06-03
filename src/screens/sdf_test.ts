import {
  BeatmapDifficultySection,
  PathPoint,
  PathType,
  SliderPath,
  Vector2,
} from "osu-classes";
import { Application, Container } from "pixi.js";
import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
} from "../constants";
import { MainCirclePiece } from "../render/circle";
import { SliderPathSprite } from "../render/sdf/signed_distance_field";
import { AbstractScreen, ScreenManager } from "./screen";

export class SDFTestScreen extends AbstractScreen {
  constructor(app: Application, manager: ScreenManager) {
    super(app, manager);

    // app.renderer.backgroundColor = 0x550055;
    app.renderer.clearBeforeRender = false;

    const path = new SliderPath(
      undefined,
      [
        new PathPoint(new Vector2(0, 0), PathType.Bezier),
        new PathPoint(new Vector2(50, 0), undefined),
        new PathPoint(new Vector2(50, 50), PathType.Linear),
        new PathPoint(new Vector2(125, 50), PathType.Bezier),
        new PathPoint(new Vector2(150, 200), undefined),
        new PathPoint(new Vector2(100, 200), undefined),
        new PathPoint(new Vector2(0, 200), undefined),
      ],
      350
    ).path;

    // const path = new SliderPath(
    //   undefined,
    //   [
    //     new PathPoint(new Vector2(0, 0), PathType.Linear),
    //     new PathPoint(new Vector2(100, 50), PathType.Linear),
    //     new PathPoint(new Vector2(50, 100), PathType.Linear),
    //   ],
    //   200
    // ).path;

    const playArea = new Container();
    playArea.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    playArea.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.contianer.addChild(playArea);

    const difficulty = new BeatmapDifficultySection();

    console.log(playArea.worldTransform);
    playArea.addChild(new SliderPathSprite(path, difficulty.circleSize));
    playArea.addChild(new MainCirclePiece(app, () => 100, 500, 0xffffff, difficulty));
  }

  protected tick(): void {
    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.contianer
    );
  }
}
