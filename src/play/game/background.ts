import { POLICY } from "adaptive-scale";
import { Application, IDestroyOptions, Sprite, Texture } from "pixi.js";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { adaptiveScaleDisplayObject, TimeMsProvider } from "../constants";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class Background extends Sprite {
  private app: Application;
  private clock: TimeMsProvider;

  private videoStartTime: number | null = null;
  private videoStarted = false;
  private video: HTMLVideoElement | null = null;

  private backgroundTexture: Texture | null = null;

  constructor(app: Application, clock: TimeMsProvider, beatmap: LoadedBeatmap) {
    super();

    this.app = app;
    this.clock = clock;

    if (beatmap.backgroundUrl) {
      this.texture = Texture.from(beatmap.backgroundUrl);
    }

    if (beatmap.videoUrl) {
      this.video = document.createElement("video");
      this.video.src = beatmap.videoUrl;
      this.video.muted = true;
      this.video.autoplay = false;
      this.video.addEventListener(
        "error",
        (error) => {
          console.error("Error playing video", error.error || error);
          this.video = null;
          if (this.backgroundTexture) {
            this.texture = this.backgroundTexture;
          }
        },
        true
      );
      this.videoStartTime = beatmap.data.events.videoOffset! / 1000;
      if (this.videoStartTime < 0) {
        this.video.currentTime = -this.videoStartTime;
      }
    }

    app.ticker.add(this.tick, this);
  }

  tick() {
    const timeElapsed = this.clock() / 1000;

    adaptiveScaleDisplayObject(
      this.app.screen,
      this.texture,
      this,
      this.texture == this.backgroundTexture ? POLICY.ShowAll : POLICY.NoBorder
    );

    if (this.video && timeElapsed >= this.videoStartTime!) {
      if (!this.videoStarted) {
        this.videoStarted = true;

        this.texture = Texture.from(this.video);
        this.video.play();
      }

      const targetVideoTime = timeElapsed - this.videoStartTime!;

      if (targetVideoTime > this.video.duration) {
        this.video = null;
        if (this.backgroundTexture) {
          this.texture = this.backgroundTexture;
        }
      }

      const skew = this.video!.currentTime - targetVideoTime;

      if (Math.abs(skew) > MAX_VIDEO_SKEW_SEEK) {
        this.video!.currentTime = targetVideoTime;
        this.video!.playbackRate = 1;
        console.warn("Video skew high, seeking");
      } else if (Math.abs(skew) > MAX_VIDEO_SKEW_SPEED) {
        console.warn("Video skew high, changing playbackRate");
        if (skew > 0) {
          this.video!.playbackRate = 0.5;
        } else {
          this.video!.playbackRate = 2;
        }
      } else {
        this.video!.playbackRate = 1;
      }
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
