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
import { StoryboardTimeline } from "./storyboard_timeline";

export class StandardGame extends Container {
  private app: Application;

  private storyboardTimeline?: StoryboardTimeline;
  private background?: Background;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private gameContainer: Container;
  private playAreaContainer: Container;

  private timeElapsed = 0;

  private hitObjectTimeline: HitObjectTimeline;
  private cursorAutoplay: CursorAutoplay;

  private frameTimes: number[] | null = [];

  constructor(app: Application, beatmap: LoadedBeatmap) {
    super();

    this.app = app;

    this.sound = Sound.from(beatmap.audioData);

    if (beatmap.storyboard) {
      this.storyboardTimeline = new StoryboardTimeline(
        beatmap.storyboardResources,
        beatmap.storyboard
      );
    } else {
      this.background = new Background(app, beatmap);
      this.addChild(this.background);
    }

    this.gameContainer = new Container();
    if (this.storyboardTimeline) {
      this.gameContainer.addChild(this.storyboardTimeline);
    }
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
    this.playAreaContainer.addChild(
      this.hitObjectTimeline,
      this.cursorAutoplay
    );

    this.interactive = true;
    this.interactiveChildren = false;

    (async () => {
      this.mediaInstance = await this.sound!.play();
    })();

    app.ticker.add(this.tick, this);
  }

  protected tick() {
    this.frameTimes?.push(this.app.ticker.elapsedMS);
    if (
      this.frameTimes &&
      this.mediaInstance &&
      this.mediaInstance.progress == 1
    ) {
      console.log("Rendered", this.frameTimes.length, "frames");
      this.frameTimes.sort((a, b) => a - b);
      const Ps = [50, 90, 99, 99.9, 99.99];
      for (const P of Ps) {
        console.log(
          `P${P}`,
          this.frameTimes[
            Math.floor((this.frameTimes.length * P) / 100)
          ].toFixed(2)
        );
      }
      console.log("min", this.frameTimes[0].toFixed(2));
      console.log(
        "max",
        this.frameTimes[this.frameTimes.length - 1].toFixed(2)
      );
      console.log(
        "mean",
        (
          this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length
        ).toFixed(2)
      );
      this.frameTimes = null;
    }

    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.gameContainer
    );

    if (!this.mediaInstance || !this.sound) {
      this.background?.update(0);
      this.storyboardTimeline?.update(0);
      return;
    }

    this.timeElapsed = this.mediaInstance.progress * this.sound.duration;

    this.hitObjectTimeline.update(this.timeElapsed * 1000);
    this.cursorAutoplay.update(this.timeElapsed * 1000);
    this.background?.update(this.timeElapsed * 1000);
    this.storyboardTimeline?.update(this.timeElapsed * 1000);
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
