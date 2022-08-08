import { Container, Sprite, utils } from "pixi.js";
import { POLICY } from "../../adaptive-scale";
import {
  adaptiveScaleDisplayObject,
  STORYBOARD_BRIGHTNESS,
  VIRTUAL_SCREEN,
} from "../../constants";
import { LoadedBeatmap } from "../../loader/util";
import { IUpdatable } from "../../game/timeline";
import { LayerType, StoryboardVideo } from "osu-classes";
import { VideoPlayerFFmpeg } from "./video/video_player_ffmpeg";
import { VideoPlayerHTML5 } from "./video/video_player_html5";

const VIDEO_PRELOAD_TIME_MS = 1000;

export class StoryboardVideoLayer extends Container implements IUpdatable {
  private background: Sprite | undefined;
  private videoURLs: Map<string, string | null>;
  private videoObjects: StoryboardVideo[];

  private activeVideoObject: StoryboardVideo | null = null;
  private activeVideoPlayer: (Sprite & IUpdatable) | null = null;

  constructor({ background, videoURLs, storyboard, data }: LoadedBeatmap) {
    super();
    if (!data.events.isBackgroundReplaced && background) {
      this.background = Sprite.from(background);
      this.background.tint = utils.rgb2hex([
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
      ]);
      adaptiveScaleDisplayObject(
        VIRTUAL_SCREEN,
        this.background.texture,
        this.background,
        POLICY.ShowAll
      );
      this.addChild(this.background);
    }
    this.videoURLs = videoURLs;
    this.videoObjects = storyboard
      .getLayerByType(LayerType.Video)
      .elements.slice();
    this.videoObjects.sort((a, b) => a.startTime - b.startTime);
  }

  update(timeMs: number): void {
    if (this.activeVideoPlayer) {
      if (this.activeVideoPlayer.destroyed) {
        this.activeVideoPlayer = null;
        this.activeVideoObject = null;
        if (this.background) this.background.visible = false;
      } else {
        adaptiveScaleDisplayObject(
          VIRTUAL_SCREEN,
          this.activeVideoPlayer.texture,
          this.activeVideoPlayer,
          POLICY.NoBorder
        );
        if (timeMs > this.activeVideoObject!.startTime) {
          if (this.background) this.background.visible = false;
          this.activeVideoPlayer.visible = true;
          this.activeVideoPlayer.update(
            timeMs - this.activeVideoObject!.startTime
          );
        }
      }
    }

    if (
      !this.activeVideoPlayer &&
      this.videoObjects.length > 0 &&
      timeMs + VIDEO_PRELOAD_TIME_MS > this.videoObjects[0].startTime
    ) {
      this.activeVideoObject = this.videoObjects.shift()!;
      const url = this.videoURLs.get(this.activeVideoObject.filePath);
      if (url) {
        if (url.startsWith("file:")) {
          // FFmpeg
          this.activeVideoPlayer = new VideoPlayerFFmpeg(url);
        } else {
          // HTML5
          this.activeVideoPlayer = new VideoPlayerHTML5(url);
        }
        this.activeVideoPlayer.visible = false;
        this.activeVideoPlayer.tint = utils.rgb2hex([
          STORYBOARD_BRIGHTNESS,
          STORYBOARD_BRIGHTNESS,
          STORYBOARD_BRIGHTNESS,
        ]);
        this.addChild(this.activeVideoPlayer);
      } else {
        console.warn("No url found for video");
        this.activeVideoObject = null;
      }
    }
  }
}
