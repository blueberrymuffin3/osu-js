import { POLICY } from "../adaptive-scale";
import { Sprite, Texture } from "pixi.js";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { adaptiveScaleDisplayObject } from "../constants";
import { IUpdatable } from "./timeline";
import { VIRTUAL_SCREEN } from "./standard_game";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class Background extends Sprite implements IUpdatable {
  private videoStartTime: number | null = null;
  private videoStarted = false;
  private video: HTMLVideoElement | null = null;

  private backgroundTexture: Texture | null = null;

  constructor(beatmap: LoadedBeatmap) {
    super();

    // Dim by a fixed amount
    // TODO: Dim automatically
    this.tint = 0x333333;

    if (beatmap.background) {
      this.texture = beatmap.background;
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
  }

  update(timeMs: number) {
    const timeElapsed = timeMs / 1000;

    adaptiveScaleDisplayObject(
      VIRTUAL_SCREEN,
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
}
