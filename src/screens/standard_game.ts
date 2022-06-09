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
import { CirclePiece } from "../render/circle";
import { HittableObject, SlidableObject } from "osu-parsers-web";
import { Cursor } from "../render/cursor";
import { SliderPiece } from "../render/slider";
import { StoryboardRenderer } from "../render/storyboard";

const maxVideoSkewSpeed = 0.05;
const maxVideoSkewSeek = 0.5;

interface InstantiatedHitObject {
  object: Container;
  data: HittableObject;
}

export class StandardGameScreen extends AbstractScreen {
  private background: Sprite | null = null;

  private video: HTMLVideoElement | null = null;
  private videoSprite: Sprite | null = null;
  private videoStarted = false;
  private videoError = false;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private storyboardRenderer: StoryboardRenderer | null = null;

  private gameContainer: Container;
  private playAreaContainer: Container;
  private beatmap: LoadedBeatmap;
  private nextHitObjectIndex: number = 0;
  private instantiatedHitObjects: InstantiatedHitObject[] = [];

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

    this.gameContainer = new Container();

    if (beatmap.storyboard) {
      this.storyboardRenderer = new StoryboardRenderer(
        app,
        beatmap.zip,
        this.clock,
        beatmap.storyboard
      );
      this.gameContainer.addChild(this.storyboardRenderer);
    } else if (beatmap.backgroundUrl) {
      app.loader.add(beatmap.backgroundUrl);
      this.background = Sprite.from(beatmap.backgroundUrl);
      this.container.addChild(this.background);
    }
    
    this.container.addChild(this.gameContainer);

    this.playAreaContainer = new Container();
    this.playAreaContainer.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    this.playAreaContainer.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.gameContainer.addChild(this.playAreaContainer);
    this.gameContainer.addChild(new Cursor(app));

    this.container.interactive = true;
    this.container.interactiveChildren = false;


    (async () => {
      await this.storyboardRenderer?.load();
      this.mediaInstance = await this.sound!.play();
    })();
  }

  private instantiateHitObject(_hitObject: IHitObject) {
    if (_hitObject.hitType & HitType.Normal) {
      const hitObject = _hitObject as HittableObject;
      const object = new CirclePiece(
        this.app,
        this.clock,
        hitObject.startTime,
        0x4fe90d, // TODO: Where are these colors stored???
        this.beatmap.data.difficulty
      );
      object.x = hitObject.startPosition.x;
      object.y = hitObject.startPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instantiatedHitObjects.push({ object, data: hitObject });
    } else if (_hitObject.hitType & HitType.Slider) {
      const hitObject = _hitObject as SlidableObject;
      const object = new SliderPiece(
        this.app,
        this.clock,
        0x4fe90d, // TODO: Where are these colors stored???
        hitObject,
        this.beatmap.data.difficulty
      );
      object.x = hitObject.startPosition.x;
      object.y = hitObject.startPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instantiatedHitObjects.push({ object, data: hitObject });
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

    while (
      this.instantiatedHitObjects.length > 0 &&
      this.instantiatedHitObjects[0].data.startTime < this.timeElapsed * 1000
    ) {
      const { object } = this.instantiatedHitObjects.shift()!;
      if (object instanceof CirclePiece) {
        object.explode();
      } else {
        // this.playAreaContainer.removeChild(object);
        // object.destroy({
        //   children: true,
        // });
      }
    }

    if (this.video) {
      if (
        this.videoError ||
        this.timeElapsed < this.beatmap.data.events.videoOffset! / 1000
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
          this.timeElapsed - this.beatmap.data.events.videoOffset! / 1000;
        const skew = this.video.currentTime - targetVideoTime;

        if (targetVideoTime > this.video.duration) {
          console.warn("Video ended");
          this.video = null;
        } else if (Math.abs(skew) > maxVideoSkewSeek) {
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
