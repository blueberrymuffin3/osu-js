import { Circle } from "osu-standard-stable";
import {
  Container,
  Sprite,
  IDestroyOptions,
  BitmapText,
  IBitmapTextStyle,
  BLEND_MODES,
} from "pixi.js";
import { DropShadowFilter } from "@pixi/filter-drop-shadow";
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

const NUMBER_STYLE: Partial<IBitmapTextStyle> = {
  fontName: FONT_VENERA_FACE,
  fontSize: 80,
  align: "center",
};

const NUMBER_SHADOW_FILTER = new DropShadowFilter({
  alpha: 0.3,
  distance: 4,
  pixelSize: 1,
  blur: 0,
  rotation: 90,
});

// https://github.com/ppy/osu/blob/513ba69f6f8d61b83cc2552ae561633e3815c5c5/osu.Game.Rulesets.Osu/Skinning/Legacy/LegacyApproachCircle.cs#L46
const APPROACH_CIRCLE_SCALE_FACTOR = Math.fround(128 / 118);
const APPROACH_CIRCLE_SCALE_INITIAL = 4 * APPROACH_CIRCLE_SCALE_FACTOR;
const APPROACH_CIRCLE_SCALE_EXIT = APPROACH_CIRCLE_SCALE_FACTOR;

const FLASH_IN_TIME = 40;
const FLASH_OUT_TIME = 100;
const SCALE_TIME = 400;

// TODO: Why the fade out time twice as long as the scale time?
const FADE_OUT_TIME = 800;

export class CirclePiece extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = FADE_OUT_TIME

  private hitObject: Circle;

  private approachFadeInTime: number;
  private approachContainer: Container;
  private approachCircle: Sprite;
  
  private circleContainer: Container;
  private glow: Sprite;
  private circle: CircleTriangles;
  private numberGlow: Sprite;
  private number: BitmapText;
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
    this.circle = new CircleTriangles(color);
    this.circleContainer.addChild(this.circle);

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
    this.number = new BitmapText(label, NUMBER_STYLE);
    this.number.filters = [ NUMBER_SHADOW_FILTER ];
    this.number.anchor.set(0.5);
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
    this.circle.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    // Entering
    if (timeRelativeMs <= 0) {
      return this.animateEntering(timeRelativeMs); 
    }

    // Flash
    const flashInProgress = timeRelativeMs / FLASH_IN_TIME;

    if (flashInProgress < 1) {
      this.approachContainer.visible = false;

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
  }

  private animateFlashPhase2(timeRelativeMs: number): void {
    // Exploding
    // TODO: Add Particles

    const flashOutProgress = timeRelativeMs / FLASH_OUT_TIME;
    const fadeOutProgress = timeRelativeMs / (FADE_OUT_TIME / 2);
    const scaleProgress = Easing.outQuad(timeRelativeMs / SCALE_TIME);
    const scaleOutFactor = MathUtils.lerpClamped01(scaleProgress, 1, 1.5);

    this.flash.alpha = MathUtils.lerpClamped01(flashOutProgress, 1, 0);
    this.circleContainer.alpha = MathUtils.lerpClamped01(fadeOutProgress, 1, 0);
    this.circleContainer.scale.set(scaleOutFactor);

    // After the flash, we can hide some elements that were behind it.
    if (this.ring.visible) this.ring.visible = false;
    if (this.circle.visible) this.circle.visible = false;
    if (this.number.visible) this.number.visible = false;

    if (this.circleContainer.alpha < 0.01 && this.circleContainer.visible) {
      this.circleContainer.visible = false;
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
  }
}
