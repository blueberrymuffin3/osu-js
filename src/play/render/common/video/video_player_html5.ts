import { Sprite, Texture } from "pixi.js";
import { IUpdatable } from "../../../game/timeline";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

export class VideoPlayerHTML5 extends Sprite implements IUpdatable {
  private video: HTMLVideoElement;

  constructor(videoUrl: string) {
    super();

    this.video = document.createElement("video");

    this.video.muted = true;
    this.video.autoplay = false;

    this.video.addEventListener(
      "error",
      (error) => {
        console.error("Error playing video", error.error || error);
        this.destroy(true);
      },
      true
    );
    this.video.addEventListener("ended", () => {
      /**
       * We need to empty this texture when this video ends.
       * Otherwise Pixi will throw an error as we are trying 
       * to update the texture using the video that is already destroyed.
       */
      this.texture = Texture.EMPTY;
      this.destroy(true);
    });

    this.video.src = videoUrl;

    this.texture = Texture.from(this.video);
  }

  update(timeMs: number): void {
    if (this.tint < 1 || this.alpha < 0.01) return;

    const targetVideoTime = timeMs / 1000;

    if (this.video.paused) {
      this.video.play();
    }

    const skew = this.video.currentTime - targetVideoTime;

    if (Math.abs(skew) > MAX_VIDEO_SKEW_SEEK) {
      this.video.currentTime = targetVideoTime;
      this.video.playbackRate = 1;
      console.warn("Video skew high, seeking");
      return;
    }

    if (Math.abs(skew) > MAX_VIDEO_SKEW_SPEED) {
      this.video.playbackRate = skew > 0 ? 0.5 : 2;
      console.warn("Video skew high, changing playbackRate");
      return;
    }

    this.video.playbackRate = 1;
  }
}
