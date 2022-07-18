import { Application, Container, IDestroyOptions } from "pixi.js";
import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
} from "../constants";
import { IMediaInstance, Sound } from "@pixi/sound";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { Background } from "./background";
import { HitObjectTimeline } from "./hitobject_timeline";
import CursorAutoplay from "../render/cursor_autoplay";

export class StandardGame extends Container {
  private app: Application;

  private background: Background;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private gameContainer: Container;
  private playAreaContainer: Container;

  private timeElapsed = 0;
  private clock = () => this.timeElapsed * 1000;

  private hitObjectTimeline: HitObjectTimeline;
  private cursorAutoplay: CursorAutoplay;

  constructor(app: Application, beatmap: LoadedBeatmap) {
    super();

    this.app = app;

    this.sound = Sound.from(beatmap.audioData);

    this.background = new Background(app, this.clock, beatmap);
    this.addChild(this.background);

    this.gameContainer = new Container();
    this.addChild(this.gameContainer);

    this.playAreaContainer = new Container();
    this.playAreaContainer.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    this.playAreaContainer.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.gameContainer.addChild(this.playAreaContainer);

    this.hitObjectTimeline = new HitObjectTimeline(
      beatmap.data.difficulty,
      beatmap.data.hitObjects
    );
    this.cursorAutoplay = new CursorAutoplay(beatmap.data.hitObjects);
    this.playAreaContainer.addChild(this.hitObjectTimeline, this.cursorAutoplay);

    this.interactive = true;
    this.interactiveChildren = false;

    (async () => {
      this.mediaInstance = await this.sound!.play();
    })();

    app.ticker.add(this.tick, this);
  }

  protected tick() {
    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.gameContainer
    );

    if (!this.mediaInstance || !this.sound) {
      return;
    }

    this.timeElapsed = this.mediaInstance.progress * this.sound.duration;

    this.hitObjectTimeline.update(this.timeElapsed * 1000);
    this.cursorAutoplay.update(this.timeElapsed * 1000);
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
