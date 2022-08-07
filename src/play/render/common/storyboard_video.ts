import { StoryboardVideo } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElement } from "./storyboard_element";
import { POLICY } from "../../adaptive-scale";
import { adaptiveScaleDisplayObject, OSU_PIXELS_SCREEN_SIZE } from "../../constants";
import { LoadedBeatmap } from "../../loader/util";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class DrawableStoryboardVideo 
  extends DrawableStoryboardElement<StoryboardVideo> 
{
  private background: Texture | null = null;
  private video: HTMLVideoElement | null = null;
  private videoStartTime: number | null = null;
  private videoStarted = false;
  
  constructor(object: StoryboardVideo, beatmap: LoadedBeatmap) {
    super(object);

    this.background = beatmap.background ?? null;

    const videoUrl = beatmap.videoURLs.get(object.filePath)
    
    if (!videoUrl) {
      this.switchToBackground();
      return;
    };

    this.video = document.createElement("video");
    this.videoStartTime = object.startTime / 1000;

    if (this.videoStartTime < 0) {
      this.video.currentTime = -this.videoStartTime;
    }

    this.video.muted = true;
    this.video.autoplay = false;

    this.video.addEventListener(
      "error",
      (error) => {
        console.error("Error playing video", error.error || error);
        this.switchToBackground();
      },
      true
    );
    
    this.video.src = videoUrl;
  }

  update(timeMs: number): void {
    adaptiveScaleDisplayObject(
      OSU_PIXELS_SCREEN_SIZE,
      this.texture,
      this,
      POLICY.NoBorder
    );

    if (this.video === null) return;

    // Current video is ended.
    if (this.video.ended) {
      return this.switchToBackground();
    }

    const timeElapsed = timeMs / 1000;
    
    // Video hasn't been started yet.
    if (timeElapsed < this.videoStartTime!) {
      return;
    }
    
    const targetVideoTime = timeElapsed - this.videoStartTime!;

    // Do this only once at the start of the video
    if (!this.videoStarted) {
      this.texture = Texture.from(this.video);
      this.video.play();
      this.videoStarted = true;
    }

    const skew = this.video.currentTime - targetVideoTime;
    
    if (Math.abs(skew) > MAX_VIDEO_SKEW_SEEK) {
      this.video.currentTime = targetVideoTime;
      this.video.playbackRate = 1;
      // console.warn("Video skew high, seeking");
      return;
    }
    
    if (Math.abs(skew) > MAX_VIDEO_SKEW_SPEED) {
      this.video.playbackRate = skew > 0 ? 0.5 : 2;
      // console.warn("Video skew high, changing playbackRate");
      return;
    }
    
    this.video.playbackRate = 1;
  }

  switchToBackground(): void {
    if (this.video !== null) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video = null;
    }

    if (this.background !== null) {
      this.texture = this.background;
    }
  }
}