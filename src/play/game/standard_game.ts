import {
  Application,
  Container,
  IDestroyOptions,
} from "pixi.js";

import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
  VIRTUAL_SCREEN,
  VIRTUAL_SCREEN_MASK,
} from "../constants";

import { IMediaInstance, Sound } from "@pixi/sound";
import { HitObjectTimeline } from "./hitobject_timeline";
import { StoryboardLayerTimeline } from "./storyboard_timeline";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { Background } from "../render/common/background";
import CursorAutoplay from "../render/standard/cursor_autoplay";

export class StandardGame extends Container {
  private app: Application;

  private storyboardVideo: StoryboardLayerTimeline;
  private storyboardBackground: StoryboardLayerTimeline;
  private storyboardPass: StoryboardLayerTimeline;
  private storyboardForeground: StoryboardLayerTimeline;
  private storyboardOverlay: StoryboardLayerTimeline;
  private background?: Background;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private gameContainer: Container;

  private timeElapsed = 0;

  private hitObjectTimeline: HitObjectTimeline;
  private cursorAutoplay: CursorAutoplay;

  private frameTimes: number[] | null = [];

  constructor(app: Application, beatmap: LoadedBeatmap) {
    super();

    this.app = app;

    this.sound = Sound.from(beatmap.audioData);

    VIRTUAL_SCREEN_MASK.setParent(this);
    this.mask = VIRTUAL_SCREEN_MASK;

    this.storyboardVideo = new StoryboardLayerTimeline(
      beatmap,
      "Video",
    );
    this.storyboardBackground = new StoryboardLayerTimeline(
      beatmap,
      "Background"
    );
    this.storyboardPass = new StoryboardLayerTimeline(beatmap, "Pass");
    this.storyboardForeground = new StoryboardLayerTimeline(
      beatmap,
      "Foreground"
    );
    this.storyboardOverlay = new StoryboardLayerTimeline(beatmap, "Overlay");

    this.gameContainer = new Container();

    adaptiveScaleDisplayObject(
      VIRTUAL_SCREEN,
      OSU_PIXELS_SCREEN_SIZE,
      this.gameContainer
    );

    const isBackgroundReplaced = beatmap.data.events.isBackgroundReplaced;

    if (!isBackgroundReplaced && !beatmap.videoURLs.size) {
      this.background = new Background(beatmap);
      this.addChild(this.background);
    } else {
      this.addChild(this.storyboardVideo);
    }

    this.hitObjectTimeline = new HitObjectTimeline(beatmap.data);

    this.cursorAutoplay = new CursorAutoplay(beatmap.data.hitObjects);
    const cursorContainer = new Container();
    cursorContainer.addChild(this.cursorAutoplay);

    this.hitObjectTimeline.position.copyFrom(OSU_PIXELS_PLAY_AREA_OFFSET);
    cursorContainer.position.copyFrom(OSU_PIXELS_PLAY_AREA_OFFSET);

    this.gameContainer.addChild(
      this.storyboardBackground,
      this.storyboardPass,
      this.storyboardForeground,
      this.hitObjectTimeline,
      this.storyboardOverlay,
      cursorContainer
    );

    this.addChild(this.gameContainer);

    this.interactive = true;
    this.interactiveChildren = false;

    (async () => {
      this.mediaInstance = await this.sound!.play();
    })();

    app.ticker.add(this.tick, this);
  }

  protected tick() {
    adaptiveScaleDisplayObject(this.app.screen, VIRTUAL_SCREEN, this);

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

    if (!this.mediaInstance || !this.sound) {
      this.storyboardVideo.update(0);
      this.storyboardBackground.update(0);
      return;
    }

    this.timeElapsed = this.mediaInstance.progress * this.sound.duration;
    const timeElapsedMs = this.timeElapsed * 1000;

    this.hitObjectTimeline.update(timeElapsedMs);
    this.cursorAutoplay.update(timeElapsedMs);
    this.storyboardVideo.update(timeElapsedMs);
    this.storyboardBackground.update(timeElapsedMs);
    this.storyboardPass.update(timeElapsedMs);
    this.storyboardForeground.update(timeElapsedMs);
    this.storyboardOverlay.update(timeElapsedMs);
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
