import { StoryboardVideo } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElement } from "./storyboard_element";
import { LoadedBeatmap } from "../../api/beatmap-loader";
import { POLICY } from "../../adaptive-scale";
import { 
  adaptiveScaleDisplayObject, 
  OSU_PIXELS_SCREEN_WIDESCREEN 
} from "../../constants";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class DrawableStoryboardVideo 
  extends DrawableStoryboardElement<StoryboardVideo> 
{
  private videoStartTime: number | null = null;
  private videoStarted = false;
  private video: HTMLVideoElement | null = null;

  private backgroundTexture: Texture | null = null;
  
  constructor(object: StoryboardVideo, beatmap: LoadedBeatmap) {
    super(object);

    this.anchor.set(0.5);
    this.backgroundTexture = beatmap.background ?? null;
  
    if (!beatmap.videoUrl) return;

    this.video = document.createElement("video");
    this.video.width = OSU_PIXELS_SCREEN_WIDESCREEN.width;
    this.video.height = OSU_PIXELS_SCREEN_WIDESCREEN.height;
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

    this.videoStartTime = object.startTime / 1000;

    if (this.videoStartTime < 0) {
      this.video.currentTime = -this.videoStartTime;
    }
  }

  update(timeMs: number): void {
    const timeElapsed = timeMs / 1000;

    if (this.video && timeElapsed >= this.videoStartTime!) {
      if (!this.videoStarted) {
        this.videoStarted = true;

        this.texture = Texture.from(this.video, {

        });
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

    adaptiveScaleDisplayObject(
      OSU_PIXELS_SCREEN_WIDESCREEN,
      this.texture,
      this,
      POLICY.ExactFit
    );
  }
}