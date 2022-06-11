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
import { SliderPathSprite } from "../render/components/slider_path";
import { AbstractScreen, ScreenManager } from "./screen";

export class SDFTestScreen extends AbstractScreen {
  private timer = 0;
  private pathSprite: SliderPathSprite;

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
    );

    // const path = new SliderPath(
    //   undefined,
    //   [
    //     new PathPoint(new Vector2(0, 0), PathType.Linear),
    //     new PathPoint(new Vector2(100, 50), PathType.Linear),
    //     new PathPoint(new Vector2(50, 100), PathType.Linear),
    //   ],
    //   200
    // );

    const playArea = new Container();
    playArea.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    playArea.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.container.addChild(playArea);

    const difficulty = new BeatmapDifficultySection();

    this.pathSprite = new SliderPathSprite(app, path, 0xffffff, difficulty);
    playArea.addChild(this.pathSprite);
    // playArea.addChild(new CirclePiece(app, () => 100, 500, 0xffffff, difficulty));
  }

  protected tick(): void {
    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.container
    );

    this.timer += this.app.ticker.deltaTime * 0.1;
    let val = Math.sin(this.timer / 10);
    if (val > 0) {
      this.pathSprite.startProp = val;
      this.pathSprite.endProp = 1;
    } else {
      this.pathSprite.startProp = 0;
      this.pathSprite.endProp = 1+val;
    }
  }
}
