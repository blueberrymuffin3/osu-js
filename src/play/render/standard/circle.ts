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
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW,
} from "../../resources/textures";
import { CircleTriangles } from "./components/circle_triangles";
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

const GLOW_ALPHA_DEFAULT = 0.5;
const FLASH_IN_ALPHA_EXIT = 0.8;
const EXPLODED_TRIANGLE_ALPHA_INITIAL = 0.2;
const EXPLODED_TRIANGLE_SCALE_INITIAL = 1.1;
const SCALE_EXIT = 1.5;
const NUMBER_OFFSET_Y = 8;

const GLOW_FADE_OUT_TIME = 400;
const FLASH_IN_TIME = 40;
const FLASH_OUT_TIME = 100;
const SCALE_TIME = 400;
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
  private circle: CircleTriangles;
  private explosion: ExplodePiece;
  private glow: Sprite;
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
    const randomSeed = this.hitObject.startTime;

    this.circle = new CircleTriangles(color, circleMask, randomSeed);
    this.circle.addChild(circleMask);
    this.explosion = new ExplodePiece(color, randomSeed);

    this.explosion.position.set(
      this.circle.trianglesMesh.x * EXPLODED_TRIANGLE_SCALE_INITIAL,
      this.circle.trianglesMesh.y * EXPLODED_TRIANGLE_SCALE_INITIAL
    );
    this.explosion.scale.set(
      this.circle.trianglesMesh.scale.x * EXPLODED_TRIANGLE_SCALE_INITIAL,
      this.circle.trianglesMesh.scale.y * EXPLODED_TRIANGLE_SCALE_INITIAL
    );

    this.circleContainer.addChild(this.circle, this.explosion);

    this.glow = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW);
    this.glow.blendMode = BLEND_MODES.ADD;
    this.glow.anchor.set(0.5);
    this.glow.alpha = GLOW_ALPHA_DEFAULT;
    this.glow.tint = color;
    this.circleContainer.addChild(this.glow);

    this.numberGlow = Sprite.from(TEXTURE_NUMBER_GLOW);
    this.numberGlow.scale.set(0.85);
    this.numberGlow.alpha = GLOW_ALPHA_DEFAULT;
    this.numberGlow.anchor.set(0.5);
    this.numberGlow.blendMode = BLEND_MODES.ADD;
    this.circleContainer.addChild(this.numberGlow);

    const label = (hitObject.currentComboIndex + 1).toString();
    this.number = new BitmapTextShadowed(label, NUMBER_STYLE);
    this.number.setAnchor(0.5);
    this.number.y = NUMBER_OFFSET_Y;
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
    // Keep circle & explosion triangles synchronized.
    this.circle.update(timeMs);
    this.explosion.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    // Before explosion
    if (timeRelativeMs <= 0) {
      return this.animateEntering(timeRelativeMs); 
    }

    this.approachContainer.visible = false;

    // From the start of the explosion to the very end
    this.animateExplosion(timeRelativeMs);

    const flashInProgress = timeRelativeMs / FLASH_IN_TIME;
    
    if (flashInProgress < 1) {
      // Do this only while the flash fades in.
      return this.animateFlashPhase1(flashInProgress);
    }

    // Do rest of the stuff that was delayed by the flash in time
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

  private animateExplosion(timeRelativeMs: number): void {
    /**
     * Glow fades out on drawable state update time (equivalent to hit object start time).
     * While the rest of the transforms are applied on the hit state update time (hit object end time).
     * Since our object is a circle with the same start and end time, there is no delay between its states.
     * https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Osu/Skinning/Default/MainCirclePiece.cs#L79
     */
    const glowFadeOutProgress = timeRelativeMs / GLOW_FADE_OUT_TIME;

    this.glow.alpha = MathUtils.lerpClamped01(
      glowFadeOutProgress, 
      GLOW_ALPHA_DEFAULT, 
      0
    );

    const scaleProgress = Easing.outQuad(timeRelativeMs / SCALE_TIME);
    const scaleOutFactor = MathUtils.lerp(scaleProgress, 1, SCALE_EXIT);

    this.circleContainer.scale.set(scaleOutFactor);
  }

  private animateFlashPhase1(flashInProgress: number): void {
    this.flash.alpha = MathUtils.lerpClamped01(
      flashInProgress, 
      0, 
      FLASH_IN_ALPHA_EXIT
    );

    this.explosion.alpha = MathUtils.lerpClamped01(
      flashInProgress, 
      0, 
      EXPLODED_TRIANGLE_ALPHA_INITIAL
    );
  }

  private animateFlashPhase2(timeRelativeMs: number): void {
    const flashOutProgress = timeRelativeMs / FLASH_OUT_TIME;
    const fadeOutProgress = timeRelativeMs / FADE_OUT_TIME;
    
    this.flash.alpha = MathUtils.lerpClamped01(flashOutProgress, 1, 0);
    this.circleContainer.alpha = MathUtils.lerpClamped01(fadeOutProgress, 1, 0);
    
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
