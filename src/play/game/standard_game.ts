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
import { SongProgressGraph } from "../render/common/song_progress_graph";

export class StandardGame extends Container {
  private app: Application;

  private storyboardVideo: StoryboardVideoLayer;
  private storyboardBackground: StoryboardLayerTimeline;
  private storyboardPass: StoryboardLayerTimeline;
  private storyboardForeground: StoryboardLayerTimeline;
  private storyboardOverlay: StoryboardLayerTimeline;
  private songProgressGraph: SongProgressGraph;

  private isAudioStarted = false;
  private isAudioEnded = false;
  private audio: Howl;
  private lastSeekTime = 0;
  private lastTimeUpdateMs = 0;
  private trueTimeElapsedMs = 0;
  private timeElapsedMs = 0;

  private gameContainer: Container;

  private hitObjectTimeline: HitObjectTimeline;
  private cursorAutoplay: CursorAutoplay;

  private startTimeMs: number;
  private endTimeMs: number;
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

    this.songProgressGraph = new SongProgressGraph(beatmap);

    this.gameContainer.addChild(
      this.storyboardBackground,
      this.storyboardPass,
      this.storyboardForeground,
      this.hitObjectTimeline,
      this.storyboardOverlay,
      this.songProgressGraph,
      cursorContainer
    );

    this.addChild(this.storyboardVideo, this.gameContainer);

    this.interactive = true;
    this.interactiveChildren = false;

    const { earliestEventTime, latestEventTime } = beatmap.storyboard;

    // Some storyboards start before 0 ms.
    this.startTimeMs = Math.min(0, earliestEventTime ?? 0);
    this.endTimeMs = Math.max(this.audio.duration() * 1000, latestEventTime ?? 0);

    this.timeElapsedMs = this.startTimeMs;

    app.ticker.add(this.tick, this);

    this.audio.on("end", () => this.stop());
  }

  protected tick() {
    adaptiveScaleDisplayObject(this.app.screen, VIRTUAL_SCREEN, this);

    this.timeElapsedMs = this.getTimeElapsed();

    this.frameTimes?.push(this.app.ticker.elapsedMS);

    this.hitObjectTimeline.update(this.timeElapsedMs);
    this.cursorAutoplay.update(this.timeElapsedMs);
    this.storyboardVideo.update(this.timeElapsedMs);
    this.storyboardBackground.update(this.timeElapsedMs);
    this.storyboardPass.update(this.timeElapsedMs);
    this.storyboardForeground.update(this.timeElapsedMs);
    this.storyboardOverlay.update(this.timeElapsedMs);
    this.songProgressGraph.update(this.timeElapsedMs);
  }

  private getTimeElapsed(): number {
    /**
     * Audio is not started yet or already ended. 
     * 0 ms is the time at which audio should always start playing.
     * When audio ends it pauses itself and resets seek time to 0.
     * Use {@link isAudioStarted} to make sure we don't need to play the audio again.
     */
    if (this.timeElapsedMs < 0 || this.isAudioEnded) {
      return this.timeElapsedMs + this.app.ticker.elapsedMS;
    } else if (!this.isAudioStarted) {
      this.audio.play();
      this.isAudioStarted = true;
      this.isAudioEnded = false;
    }

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
      return Math.max(this.timeElapsedMs, this.trueTimeElapsedMs);
    }
    
    // Don't overwrite elapsed time if audio seek is 0.
    return (this.audio.seek() * 1000) || this.timeElapsedMs;
  }

  stop() {
    this.frameTimes ??= [];
    this.frameTimes.sort((a, b) => a - b);

    const totalFrames = this.frameTimes.length;

    console.log("Rendered", totalFrames, "frames");
    
    const Ps = [50, 90, 99, 99.9, 99.99];

    for (const P of Ps) {
      const frameTimeIndex = Math.floor((totalFrames * P) / 100);
      const frameTime = this.frameTimes[frameTimeIndex].toFixed(2);

      console.log(`P${P} ${frameTime}`);
    }

    const min = this.frameTimes[0] ?? 0;
    const max = this.frameTimes[this.frameTimes.length - 1] ?? 0;
    const mean = this.frameTimes.reduce((a, b) => a + b) / (totalFrames || 1);

    console.log("min", min.toFixed(2));
    console.log("max", max.toFixed(2));
    console.log("mean", mean.toFixed(2));

    this.frameTimes = null;
    this.isAudioEnded = true;
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
