import { AbstractScreen, ScreenManager } from "./screen";
import {
  Application,
  Sprite,
  Texture,
  IVideoResourceOptions,
  Container,
} from "pixi.js";
import {
  adaptiveScaleDisplayObject,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
  preemtTimeFromAr,
} from "../constants";
import { IMediaInstance, Sound } from "@pixi/sound";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { HitType, IHitObject } from "osu-classes";
import { POLICY } from "adaptive-scale/lib-esm";
import { MainCirclePiece } from "../render/circle";
import { SliderPathSprite } from "../render/sdf/signed_distance_field";
import {
  HittableObject,
  SlidableObject,
  SpinnableObject,
} from "osu-parsers-web";

const maxVideoSkewSpeed = 0.05;
const maxVideoSkewSeek = 2;

export class StandardGameScreen extends AbstractScreen {
  private background: Sprite | null = null;

  private video: HTMLVideoElement | null = null;
  private videoSprite: Sprite | null = null;
  private videoStarted = false;
  private videoError = false;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private gameContainer: Container;
  private playAreaContainer: Container;
  private beatmap: LoadedBeatmap;
  private nextHitObjectIndex: number = 0;
  private instanciatedHitObjects: Container[] = [];

  private timeElapsed = 0;
  private clock = () => this.timeElapsed * 1000;

  private preemtTime: number;

  constructor(
    app: Application,
    manager: ScreenManager,
    beatmap: LoadedBeatmap
  ) {
    super(app, manager);

    this.beatmap = beatmap;

    this.preemtTime = preemtTimeFromAr(beatmap.data.difficulty.approachRate);

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
      this.container.addChild(this.videoSprite);
    }

    if (beatmap.backgroundUrl) {
      app.loader.add(beatmap.backgroundUrl);
      this.background = Sprite.from(beatmap.backgroundUrl);
      this.container.addChild(this.background);
    }

    (async () => {
      this.mediaInstance = await this.sound!.play();
    })();

    this.gameContainer = new Container();
    // TODO: Fix black artifacts around the edges of the circles
    // this.gameContainer.filters = [new filters.FXAAFilter()];
    this.container.addChild(this.gameContainer);

    this.playAreaContainer = new Container();
    this.playAreaContainer.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    this.playAreaContainer.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.gameContainer.addChild(this.playAreaContainer);
  }

  private instantiateHitObject(_hitObject: IHitObject) {
    if (_hitObject.hitType & HitType.Normal) {
      const hitObject = _hitObject as HittableObject;
      const object = new MainCirclePiece(
        this.app,
        this.clock,
        hitObject.startTime,
        0x4fe90d, // TODO: Where are these colors stored???
        this.beatmap.data.difficulty
      );
      object.x = hitObject.startPosition.x;
      object.y = hitObject.startPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instanciatedHitObjects.push(object);
    } else if (_hitObject.hitType & HitType.Slider) {
      const hitObject = _hitObject as SlidableObject;
      const object = new SliderPathSprite(
        this.app,
        hitObject.path,
        this.beatmap.data.difficulty.circleSize
      );
      object.x = hitObject.startPosition.x;
      object.y = hitObject.startPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instanciatedHitObjects.push(object);
    }
  }

  protected tick() {
    this.background &&
      adaptiveScaleDisplayObject(
        this.app.screen,
        this.background.texture,
        this.background
      );
    this.videoSprite &&
      adaptiveScaleDisplayObject(
        this.app.screen,
        this.videoSprite.texture,
        this.videoSprite,
        POLICY.NoBorder
      );
    adaptiveScaleDisplayObject(
      this.app.screen,
      OSU_PIXELS_SCREEN_SIZE,
      this.gameContainer
    );

    if (!this.mediaInstance || !this.sound) {
      return;
    }

    this.timeElapsed = this.mediaInstance.progress * this.sound.duration;

    for (
      ;
      this.nextHitObjectIndex < this.beatmap.data.hitObjects.length;
      this.nextHitObjectIndex++
    ) {
      const hitObject = this.beatmap.data.hitObjects[this.nextHitObjectIndex];
      if (hitObject.startTime > this.timeElapsed * 1000 + this.preemtTime)
        break; // We're in the future

      this.instantiateHitObject(hitObject);
    }

    if (this.video) {
      if (
        this.videoError ||
        this.timeElapsed < this.beatmap.data.events.videoOffset!
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
          this.timeElapsed - this.beatmap.data.events.videoOffset!;
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
}
