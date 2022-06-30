import { BeatmapDifficultySection } from "osu-classes";
import {
  Container,
  Application,
  Sprite,
  IDestroyOptions,
  BitmapText,
  IBitmapTextStyle,
} from "pixi.js";
import { clamp01, lerp } from "../anim";
import {
  diameterFromCs,
  fadeInTimeFromAr,
  OSU_HIT_OBJECT_RADIUS,
  preemtTimeFromAr,
  TimeMsProvider,
} from "../constants";
import { FONT_VENERA_FACE } from "../resources/fonts";
import {
  TEXTURE_FLASH,
  TEXTURE_NUMBER_GLOW,
  TEXTURE_OSU_RING,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW,
} from "../resources/textures";
import { CircleTriangles } from "./components/circle_triangles";

const NUMBER_STYLE: Partial<IBitmapTextStyle> = {
  fontName: FONT_VENERA_FACE,
  fontSize: 80,
  align: "center",
};

const FLASH_IN_TIME = 40;
const FLASH_OUT_TIME = 100;
const SCALE_TIME = 800;
const FADE_OUT_TIME = 400;

export class CirclePiece extends Container {
  private app: Application;
  private clock: TimeMsProvider;
  private startTime: number;
  private preempt: number;
  private fadeIn: number;

  private approachCircle: Sprite | null;
  private glow: Sprite | null;
  private circle: CircleTriangles | null;
  private numberGlow: Sprite | null;
  private number: BitmapText | null;
  private ring: Sprite | null;
  private flash: Sprite | null = null;

  private intialScale: number;
  private explodeStart: number | null = null;
  private explodePhase2 = false;

  public constructor(
    app: Application,
    clock: TimeMsProvider,
    startTime: number,
    color: number,
    label: string,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.app = app;
    this.clock = clock;
    this.startTime = startTime;
    this.preempt = preemtTimeFromAr(difficulty.approachRate);
    this.fadeIn = fadeInTimeFromAr(difficulty.approachRate);

    this.intialScale =
      diameterFromCs(difficulty.circleSize) / (2 * OSU_HIT_OBJECT_RADIUS);
    this.scale.set(this.intialScale);

    this.approachCircle = Sprite.from(
      TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE
    );
    this.approachCircle.anchor.set(0.5);
    this.approachCircle.tint = color;
    this.addChild(this.approachCircle);

    this.glow = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW);
    this.glow.anchor.set(0.5);
    this.glow.alpha = 0.5;
    this.glow.tint = color;
    this.addChild(this.glow);

    this.circle = new CircleTriangles(app, color);
    this.addChild(this.circle);

    this.numberGlow = Sprite.from(TEXTURE_NUMBER_GLOW);
    this.numberGlow.scale.set(0.5);
    this.numberGlow.alpha = 0.5;
    this.numberGlow.anchor.set(0.5);
    this.addChild(this.numberGlow);

    this.number = new BitmapText(label, NUMBER_STYLE);
    this.number.anchor.set(0.5);
    this.number.y = 8;
    this.addChild(this.number);

    this.ring = Sprite.from(TEXTURE_OSU_RING);
    this.ring.anchor.set(0.5);
    this.addChild(this.ring);

    app.ticker.add(this.tick, this);
  }

  public explode() {
    this.explodeStart = this.clock();
    this.flash = Sprite.from(TEXTURE_FLASH);
    this.flash.anchor.set(0.5);
    this.addChild(this.flash);
  }

  private startExplodePhase2() {
    this.explodePhase2 = true;

    // prettier-ignore
    for (const key of ["approachCircle", "circle", "numberGlow", "number", "ring"] as ["approachCircle", "circle", "numberGlow", "number", "ring"]) {
      this.removeChild(this[key]!);
      this[key]!.destroy();
      this[key] = null;
    }
  }

  tick() {
    if (this.explodeStart != null) {
      const progress = this.clock() - this.explodeStart;
      if (progress > SCALE_TIME) {
        this.destroy({ children: true });
        return;
      }

      this.scale.set(lerp(progress / SCALE_TIME, 1.0, 1.5) * this.intialScale);

      const progressIn = progress / FLASH_IN_TIME;
      if (progressIn < 1) {
        this.flash!.alpha = clamp01(progressIn);
      } else {
        if (!this.explodePhase2) {
          this.startExplodePhase2();
        }
        const progress2 = progress - FLASH_IN_TIME;
        this.flash!.alpha = clamp01(1 - progress2 / FLASH_OUT_TIME);
        this.alpha = clamp01(1 - progress2 / FADE_OUT_TIME);
      }
    }

    if (this.approachCircle) {
      const progress = this.clock() - (this.startTime - this.preempt);

      this.alpha = lerp(progress / this.fadeIn, 0, 1);
      this.approachCircle.scale.set(lerp(progress / this.preempt, 4, 1));
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
