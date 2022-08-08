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
    this.video.addEventListener("ended", () => this.destroy(true));

    this.video.src = videoUrl;

    this.texture = Texture.from(this.video);
  }

  update(timeMs: number): void {
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
