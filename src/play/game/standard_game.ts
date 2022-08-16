import { Application, Container, IDestroyOptions } from "pixi.js";
import { Howl } from "howler";

import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
  VIRTUAL_SCREEN,
  VIRTUAL_SCREEN_MASK,
  isUsingFirefox,
  firefoxMaxTimeBetweenUpdates,
} from "../constants";

import { HitObjectTimeline } from "./hitobject_timeline";
import { StoryboardLayerTimeline } from "./storyboard_timeline";
import CursorAutoplay from "../render/standard/cursor_autoplay";
import { LoadedBeatmap } from "../loader/util";
import { StoryboardVideoLayer } from "../render/common/storyboard_video";

export class StandardGame extends Container {
  private app: Application;

  private storyboardVideo: StoryboardVideoLayer;
  private storyboardBackground: StoryboardLayerTimeline;
  private storyboardPass: StoryboardLayerTimeline;
  private storyboardForeground: StoryboardLayerTimeline;
  private storyboardOverlay: StoryboardLayerTimeline;

  private audio: Howl;
  private lastSeekTime = 0;
  private lastTimeUpdateMs = 0;
  private trueTimeElapsedMs = 0;
  private timeElapsedMs = 0;

  private gameContainer: Container;

  private hitObjectTimeline: HitObjectTimeline;
  private cursorAutoplay: CursorAutoplay;

  private frameTimes: number[] | null = [];

  constructor(app: Application, beatmap: LoadedBeatmap) {
    super();

    this.app = app;

    this.app = app;
    this.audio = beatmap.audio;

    VIRTUAL_SCREEN_MASK.setParent(this);
    this.mask = VIRTUAL_SCREEN_MASK;

    this.storyboardVideo = new StoryboardVideoLayer(beatmap);
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

    this.addChild(this.storyboardVideo, this.gameContainer);

    this.interactive = true;
    this.interactiveChildren = false;

    app.ticker.add(this.tick, this);

    this.audio.play();
    this.audio.on("end", () => {
      this.frameTimes ??= [];
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
    });
  }

  protected tick() {
    adaptiveScaleDisplayObject(this.app.screen, VIRTUAL_SCREEN, this);

    if (isUsingFirefox) {
      // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=587465

      const seekTime = this.audio.seek();
      if (seekTime != this.lastSeekTime) {
        this.trueTimeElapsedMs = seekTime * 1000;
        this.lastTimeUpdateMs = this.trueTimeElapsedMs;
        this.lastSeekTime = seekTime;
      } else if (
        this.trueTimeElapsedMs - this.lastTimeUpdateMs <
        firefoxMaxTimeBetweenUpdates
      ) {
        // Only update if the audio isn't paused
        this.trueTimeElapsedMs += this.app.ticker.elapsedMS;
      }

      // Ensure time is monotonic
      this.timeElapsedMs = Math.max(this.timeElapsedMs, this.trueTimeElapsedMs);
    } else {
      this.timeElapsedMs = this.audio.seek() * 1000;
    }

    this.frameTimes?.push(this.app.ticker.elapsedMS);

    this.hitObjectTimeline.update(this.timeElapsedMs);
    this.cursorAutoplay.update(this.timeElapsedMs);
    this.storyboardVideo.update(this.timeElapsedMs);
    this.storyboardBackground.update(this.timeElapsedMs);
    this.storyboardPass.update(this.timeElapsedMs);
    this.storyboardForeground.update(this.timeElapsedMs);
    this.storyboardOverlay.update(this.timeElapsedMs);
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
