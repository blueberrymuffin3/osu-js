import {
  Application,
  Container,
  IDestroyOptions,
} from "pixi.js";
import {
  adaptiveScaleDisplayObject,
  OSU_DEFAULT_COMBO_COLORS,
  OSU_PIXELS_PLAY_AREA_OFFSET,
  OSU_PIXELS_SCREEN_SIZE,
  preemtTimeFromAr,
} from "../constants";
import { IMediaInstance, Sound } from "@pixi/sound";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { HitType } from "osu-classes";
import { CirclePiece } from "../render/circle";
import { HittableObject } from "osu-parsers-web";
import { Cursor } from "../render/cursor";
import { SliderPiece } from "../render/slider";
import { Circle, Slider, StandardHitObject } from "osu-standard-stable";
import { Background } from "./background";

interface InstantiatedHitObject {
  object: Container;
  data: HittableObject;
}

export class StandardGame extends Container {
  private app: Application;

  private background: Background;

  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  private gameContainer: Container;
  private playAreaContainer: Container;
  private beatmap: LoadedBeatmap;
  private nextHitObjectIndex: number = 0;
  private instantiatedHitObjects: InstantiatedHitObject[] = [];

  private timeElapsed = 0;
  private clock = () => this.timeElapsed * 1000;

  private preemtTime: number;
  private comboLabelIndex = 1;
  private comboColorIndex = 0;

  constructor(app: Application, beatmap: LoadedBeatmap) {
    super();

    this.app = app;
    this.beatmap = beatmap;

    this.preemtTime = preemtTimeFromAr(beatmap.data.difficulty.approachRate);

    this.sound = Sound.from(beatmap.audioData);

    this.background = new Background(app, this.clock, beatmap);
    this.addChild(this.background);

    this.gameContainer = new Container();
    this.addChild(this.gameContainer);

    this.playAreaContainer = new Container();
    this.playAreaContainer.x = OSU_PIXELS_PLAY_AREA_OFFSET.x;
    this.playAreaContainer.y = OSU_PIXELS_PLAY_AREA_OFFSET.y;
    this.gameContainer.addChild(this.playAreaContainer);
    this.gameContainer.addChild(new Cursor(app));

    this.interactive = true;
    this.interactiveChildren = false;

    (async () => {
      this.mediaInstance = await this.sound!.play();
    })();

    app.ticker.add(this.tick, this);
  }

  private instantiateHitObject(_hitObject: StandardHitObject) {
    if (_hitObject.hitType & HitType.NewCombo) {
      this.comboColorIndex =
        (this.comboColorIndex + 1) % OSU_DEFAULT_COMBO_COLORS.length;
      this.comboLabelIndex = 1;
    } else {
      this.comboLabelIndex += 1;
    }
    const color = OSU_DEFAULT_COMBO_COLORS[this.comboColorIndex];

    if (_hitObject.hitType & HitType.Normal) {
      const hitObject = _hitObject as Circle;
      const object = new CirclePiece(
        this.app,
        this.clock,
        hitObject.startTime,
        color,
        this.comboLabelIndex.toString(),
        this.beatmap.data.difficulty
      );
      object.x = hitObject.stackedStartPosition.x;
      object.y = hitObject.stackedStartPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instantiatedHitObjects.push({ object, data: hitObject });
    } else if (_hitObject.hitType & HitType.Slider) {
      const hitObject = _hitObject as Slider;
      const object = new SliderPiece(
        this.app,
        this.clock,
        color,
        this.comboLabelIndex.toString(),
        hitObject,
        this.beatmap.data.difficulty
      );
      object.x = hitObject.stackedStartPosition.x;
      object.y = hitObject.stackedStartPosition.y;
      this.playAreaContainer.addChildAt(object, 0);
      this.instantiatedHitObjects.push({ object, data: hitObject });
    }
  }

  protected tick() {
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
  }

  destroy(options?: IDestroyOptions | boolean) {
    super.destroy(options)
    this.app.ticker.remove(this.tick, this);
  }
}
