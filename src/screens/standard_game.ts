import { AbstractScreen, ScreenManager } from "./screen";
import { Application, Sprite, Texture, IVideoResourceOptions } from "pixi.js";
import { SCREEN_SIZE } from "../constants";
import { IMediaInstance, Sound } from "@pixi/sound";
import { LoadedBeatmap } from "../api/beatmap-loader";
import * as AdaptiveScale from "adaptive-scale/lib-esm";

const maxVideoSkewSpeed = 0.05;
const maxVideoSkewSeek = 2;

export class StandardGameScreen extends AbstractScreen {
  private background: Sprite | null = null;
  private video: HTMLVideoElement | null = null;
  private videoSprite: Sprite | null = null;
  private videoStarted = false;
  private videoError = false;
  private beatmap: LoadedBeatmap;
  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  constructor(
    app: Application,
    manager: ScreenManager,
    beatmap: LoadedBeatmap
  ) {
    super(app, manager);

    this.beatmap = beatmap;

    console.log(beatmap.data.hitObjects);

    (async () => {
      this.sound = Sound.from(beatmap.audioData);

      if (beatmap.videoUrl) {
        this.video = document.createElement("video");
        this.video.src = beatmap.videoUrl;
        this.video.muted = true;
        this.video.addEventListener(
          "error",
          (error) => {
            console.error("Error playing video", error.error || error);
            this.videoError = true;
          },
          true
        );
        this.videoSprite = Sprite.from(
          Texture.from(this.video, {
            resourceOptions: {
              autoLoad: true,
              autoPlay: false,
            } as IVideoResourceOptions,
          })
        );
        this.videoSprite.visible = false;
        this.contianer.addChild(this.videoSprite);
      }

      if (beatmap.backgroundUrl) {
        app.loader.add(beatmap.backgroundUrl);
        this.background = Sprite.from(beatmap.backgroundUrl);
        this.contianer.addChild(this.background);
      }

      this.mediaInstance = await this.sound.play();
    })();
  }

  private adaptiveScaleSprite(sprite: Sprite | null) {
    if (!sprite) return;
    const scaled = AdaptiveScale.getScaledRect({
      container: SCREEN_SIZE,
      target: sprite.texture,
      policy: AdaptiveScale.POLICY.ShowAll,
    });
    sprite.width = scaled.width;
    sprite.height = scaled.height;
    sprite.x = scaled.x;
    sprite.y = scaled.y;
  }

  protected tick() {
    this.adaptiveScaleSprite(this.background);
    this.adaptiveScaleSprite(this.videoSprite);

    if (!this.mediaInstance || !this.sound) {
      return;
    }

    const timeElapsed = this.mediaInstance.progress * this.sound.duration;
    if (this.video) {
      if (
        this.videoError ||
        timeElapsed < this.beatmap.data.events.videoOffset!
      ) {
        this.videoSprite!.visible = false;
        this.background && (this.background.visible = true);
      } else {
        this.videoSprite!.visible = true;
        this.background && (this.background.visible = false);

        if (!this.videoStarted) {
          this.video.play();
          this.videoStarted = true;
        }

        const targetVideoTime =
          timeElapsed - this.beatmap.data.events.videoOffset!;
        const skew = this.video.currentTime - targetVideoTime;

        if (Math.abs(skew) > maxVideoSkewSeek) {
          this.video.currentTime = targetVideoTime;
          this.video.playbackRate = 1;
          console.warn("Video skew high, seeking");
        } else if (Math.abs(skew) > maxVideoSkewSpeed) {
          console.warn("Video skew high, changing playbackRate");
          if (skew > 0) {
            this.video.playbackRate = 0.5;
          } else {
            this.video.playbackRate = 2;
          }
        } else {
          this.video.playbackRate = 1;
        }
      }
    }
  }

  public destroy(): void {
    this.videoSprite?.destroy();
    this.background?.destroy();
  }
}
