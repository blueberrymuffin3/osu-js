import { Circle } from "osu-standard-stable";
import {
  Container,
  Sprite,
  IDestroyOptions,
  IBitmapTextStyle,
  BLEND_MODES,
  Graphics,
} from "pixi.js";
import { Easing, MathUtils } from "osu-classes";
import { IUpdatable } from "../../game/timeline";
import { FONT_VENERA_FACE } from "../../resources/fonts";
import {
  TEXTURE_FLASH,
  TEXTURE_NUMBER_GLOW,
  TEXTURE_OSU_RING,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW,
} from "../../resources/textures";
import { ExplodePiece } from "./components/explode_piece";
import { BitmapTextShadowed } from "../common/bitmap_text_shadowed";

const NUMBER_STYLE: Partial<IBitmapTextStyle> = {
  fontName: FONT_VENERA_FACE,
  fontSize: 80,
};

// https://github.com/ppy/osu/blob/513ba69f6f8d61b83cc2552ae561633e3815c5c5/osu.Game.Rulesets.Osu/Skinning/Legacy/LegacyApproachCircle.cs#L46
const APPROACH_CIRCLE_SCALE_FACTOR = Math.fround(128 / 118);
const APPROACH_CIRCLE_SCALE_INITIAL = 4 * APPROACH_CIRCLE_SCALE_FACTOR;
const APPROACH_CIRCLE_SCALE_EXIT = APPROACH_CIRCLE_SCALE_FACTOR;

const FLASH_IN_TIME = 40;
const FLASH_OUT_TIME = 100;
const SCALE_TIME = 400;

// TODO: Why the fade out time twice as long as the scale time?
const FADE_OUT_TIME = 800;

const CIRCLE_MASK = new Graphics()
  .beginFill(0xffffff)
  .drawCircle(0, 0, 128)
  .endFill()
  .geometry;

export class CirclePiece extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = FADE_OUT_TIME;

  private hitObject: Circle;

  private approachContainer: Container;
  private approachCircle: Sprite;
  private approachFadeInTime: number;
  
  private circleContainer: Container;
  private circle: Sprite;
  private glow: Sprite;
  private triangles: ExplodePiece;
  private numberGlow: Sprite;
  private number: BitmapTextShadowed;
  private ring: Sprite;
  private flash: Sprite;

  public constructor(hitObject: Circle, color: number) {
    super();
    this.hitObject = hitObject;

    // TODO: Why times 2?
    this.scale.set(hitObject.scale / 2);

    this.approachFadeInTime = Math.min(
      this.hitObject.timeFadeIn * 2, 
      this.hitObject.timePreempt
    );

    this.approachContainer = new Container();
    this.approachCircle = Sprite.from(
      TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE
    );
    this.approachCircle.anchor.set(0.5);
    this.approachCircle.tint = color;
    this.approachContainer.addChild(this.approachCircle);
    this.addChild(this.approachContainer);

    this.circleContainer = new Container();

    const circleMask = new Graphics(CIRCLE_MASK);
    this.circle = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC);
    this.circle.tint = color;
    this.circle.anchor.set(0.5);
    this.triangles = new ExplodePiece(color, this.circle, circleMask);
    this.circle.addChild(circleMask);
    this.circleContainer.addChild(this.circle, this.triangles);

    this.glow = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW);
    this.glow.blendMode = BLEND_MODES.ADD;
    this.glow.anchor.set(0.5);
    this.glow.alpha = 0.5;
    this.glow.tint = color;
    this.circleContainer.addChild(this.glow);

    this.numberGlow = Sprite.from(TEXTURE_NUMBER_GLOW);
    this.numberGlow.scale.set(0.85);
    this.numberGlow.alpha = 0.5;
    this.numberGlow.anchor.set(0.5);
    this.numberGlow.blendMode = BLEND_MODES.ADD;
    this.circleContainer.addChild(this.numberGlow);

    const label = (hitObject.currentComboIndex + 1).toString();
    this.number = new BitmapTextShadowed(label, NUMBER_STYLE);
    this.number.setAnchor(0.5);
    this.number.y = 8;
    this.circleContainer.addChild(this.number);

    this.ring = Sprite.from(TEXTURE_OSU_RING);
    this.ring.anchor.set(0.5);
    this.circleContainer.addChild(this.ring);

    this.flash = Sprite.from(TEXTURE_FLASH);
    this.flash.blendMode = BLEND_MODES.ADD;
    this.flash.anchor.set(0.5);
    this.flash.alpha = 0;
    this.circleContainer.addChild(this.flash);
    this.addChild(this.circleContainer);
  }

  // TODO: Should be able to handle non-monotonic updates
  update(timeMs: number): void {
    this.triangles.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    // Entering
    if (timeRelativeMs <= 0) {
      return this.animateEntering(timeRelativeMs); 
    }

    // Flashing & exploding
    const flashInProgress = timeRelativeMs / FLASH_IN_TIME;

    if (flashInProgress < 1) {
      return this.animateFlashPhase1(flashInProgress);
    }

    return this.animateFlashPhase2(timeRelativeMs);
  }

  private animateEntering(timeRelativeMs: number): void {
    const timeRelativeEnterMs = timeRelativeMs + this.hitObject.timePreempt;
    const fadeInProgress = timeRelativeEnterMs / this.hitObject.timeFadeIn

    this.circleContainer.alpha = MathUtils.lerpClamped01(fadeInProgress, 0, 1);

    const approachFadeProgress = timeRelativeEnterMs / this.approachFadeInTime;

    this.approachContainer.alpha = MathUtils.lerp(approachFadeProgress, 0, 1);

    this.approachContainer.scale.set(
      MathUtils.lerpClamped01(
        timeRelativeEnterMs / this.hitObject.timePreempt, 
        APPROACH_CIRCLE_SCALE_INITIAL, 
        APPROACH_CIRCLE_SCALE_EXIT
      )
    );
  }

  private animateFlashPhase1(flashInProgress: number): void {
    this.flash.alpha = MathUtils.lerpClamped01(flashInProgress, 0, 0.8);
    this.triangles.alpha = MathUtils.lerpClamped01(flashInProgress, 0, 0.3);
    
    if (this.circle.children.length > 0) {
      // Remove triangle mask once hit object was hit
      this.circle.removeChildren();
      this.triangles.mask = null;

      // Triangles that appeared after explosion are 1.2 times larger.
      this.triangles.scale.set(
        this.triangles.scale.x * EXPLODED_TRIANGLES_SCALE_INITIAL,
        this.triangles.scale.y * EXPLODED_TRIANGLES_SCALE_INITIAL
      );

      // Align scaled triangles to center.
      this.triangles.x *= EXPLODED_TRIANGLES_SCALE_INITIAL;
      this.triangles.y *= EXPLODED_TRIANGLES_SCALE_INITIAL;
    }
  }

  private animateFlashPhase2(timeRelativeMs: number): void {
    const flashOutProgress = timeRelativeMs / FLASH_OUT_TIME;
    const fadeOutProgress = timeRelativeMs / (FADE_OUT_TIME / 2);
    const scaleProgress = Easing.outQuad(timeRelativeMs / SCALE_TIME);
    const scaleOutFactor = MathUtils.lerpClamped01(scaleProgress, 1, 1.5);

    this.flash.alpha = MathUtils.lerpClamped01(flashOutProgress, 1, 0);
    this.circleContainer.alpha = MathUtils.lerpClamped01(fadeOutProgress, 1, 0);
    this.circleContainer.scale.set(scaleOutFactor);

    // After the flash, we can hide some elements that were behind it.
    this.ring.visible = false;
    this.circle.visible = false;
    this.number.visible = false;
    this.numberGlow.visible = false;

    if (this.circleContainer.alpha < 0.01) {
      this.circleContainer.visible = false;
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
  }
}
