import { StoryboardVideo } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElement } from "./storyboard_element";
import { LoadedBeatmap } from "../../api/beatmap-loader";
import { POLICY } from "../../adaptive-scale";
import { adaptiveScaleDisplayObject, VIRTUAL_SCREEN } from "../../constants";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class DrawableStoryboardVideo 
  extends DrawableStoryboardElement<StoryboardVideo> 
{
  private static video: HTMLVideoElement | null = null;

  private video: HTMLVideoElement;
  private videoStartTime: number | null = null;
  private videoStarted = false;

  private backgroundTexture: Texture | null = null;
  
  constructor(object: StoryboardVideo, beatmap: LoadedBeatmap) {
    super(object);

    // Use a single HTML video element for all storyboard videos.
    if (!DrawableStoryboardVideo.video) {
      DrawableStoryboardVideo.video = document.createElement("video");
    }
    
    this.video = DrawableStoryboardVideo.video;
    this.backgroundTexture = beatmap.background ?? null;
    
    const videoUrl = beatmap.videoURLs.get(object.filePath)
    
    if (!videoUrl) return;

    this.video.src = videoUrl;
    this.video.muted = true;
    this.video.autoplay = false;
    this.video.addEventListener(
      "error",
      (error) => {
        console.error("Error playing video", error.error || error);
        this.video.removeAttribute('src');
        
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
    
    // Video hasn't been started yet.
    if (timeElapsed < this.videoStartTime!) {
      return;
    }
    
    const targetVideoTime = timeElapsed - this.videoStartTime!;

    // Current video is ended.
    if (targetVideoTime > this.video.duration) {
      this.video.removeAttribute('src');
      if (this.backgroundTexture) {
        this.texture = this.backgroundTexture;
      }
    }

    // Do this only once at the video start
    if (!this.videoStarted) {
      this.texture = Texture.from(this.video);
      this.video.play();
      this.videoStarted = true;
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

    adaptiveScaleDisplayObject(
      VIRTUAL_SCREEN,
      this.texture,
      this,
      POLICY.FullWidth
    );
  }
}