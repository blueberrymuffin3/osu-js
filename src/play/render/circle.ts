import { Circle } from "osu-standard-stable";
import {
  Container,
  Application,
  Sprite,
  IDestroyOptions,
  BitmapText,
  IBitmapTextStyle,
} from "pixi.js";
import { clamp01, lerp } from "../anim";
import { UpdatableDisplayObject } from "../game/timeline";
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

export class CirclePiece extends Container implements UpdatableDisplayObject {
  private hitObject: Circle;

  private approachCircle: Sprite;
  private glow: Sprite;
  private circle: CircleTriangles;
  private numberGlow: Sprite;
  private number: BitmapText;
  private ring: Sprite;
  private flash: Sprite;

  private initialScale: number;

  // TODO: Remove reference to app
  public constructor(app: Application, color: number, hitObject: Circle) {
    super();
    this.hitObject = hitObject;

    this.initialScale = hitObject.scale / 2; // TODO: Why times 2?
    this.scale.set(this.initialScale);

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

    const label = (hitObject.currentComboIndex + 1).toString();
    this.number = new BitmapText(label, NUMBER_STYLE);
    this.number.anchor.set(0.5);
    this.number.y = 8;
    this.addChild(this.number);

    this.ring = Sprite.from(TEXTURE_OSU_RING);
    this.ring.anchor.set(0.5);
    this.addChild(this.ring);

    this.flash = Sprite.from(TEXTURE_FLASH);
    this.flash.anchor.set(0.5);
    this.flash.alpha = 0;
    this.addChild(this.flash);
  }

  // TODO: Should be able to handle non-monotonic updates
  update(timeMs: number) {
    const timeRelativeMs = timeMs - this.hitObject.startTime;

    if (timeRelativeMs >= 0) {
      // Exploding
      // TODO: Add Particles
      // TODO: This is redundant

      // Expand during explosion
      this.scale.set(
        lerp(timeRelativeMs / SCALE_TIME, 1.0, 1.5) * this.initialScale
      );

      // Flash
      const progressPhase1 = timeRelativeMs / FLASH_IN_TIME;
      console.log(progressPhase1);
      if (progressPhase1 < 1) {
        // Phase 1
        this.flash.alpha = clamp01(progressPhase1);
      } else {
        // Phase 2
        this.approachCircle.visible = false;
        this.circle.visible = false;
        this.numberGlow.visible = false;
        this.number.visible = false;
        this.ring.visible = false;
        const progressPhase2 = timeRelativeMs - FLASH_IN_TIME;

        // TODO: Probably slightly incorrect because flash is faded twice
        this.flash.alpha = clamp01(1 - progressPhase2 / FLASH_OUT_TIME);
        this.alpha = clamp01(1 - progressPhase2 / FADE_OUT_TIME);
      }
    } else {
      // Entering

      const timeRelativeEnterMs = timeRelativeMs + this.hitObject.timePreempt;

      this.alpha = lerp(timeRelativeEnterMs / this.hitObject.timeFadeIn, 0, 1);
      this.approachCircle.scale.set(
        lerp(timeRelativeEnterMs / this.hitObject.timePreempt, 4, 1)
      );
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
  }
}
