import { StoryboardVideo } from "osu-classes";
import { Sprite } from "pixi.js";
import { IUpdatable } from "../../game/timeline";

class DrawableStoryboardVideo extends Sprite implements IUpdatable {
  constructor(object: StoryboardVideo) {
    super();

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

  update(timeMs: number): void {

  }
}