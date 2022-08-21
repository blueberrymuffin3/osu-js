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
import { MathUtils } from "osu-classes";
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
  distance: 4.5,
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
const SCALE_TIME = 800;
const FADE_OUT_TIME = 400;

export class CirclePiece extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = FADE_OUT_TIME

  private hitObject: Circle;

  private approachContainer: Container;
  private approachCircle: Sprite;
  
  private circleContainer: Container;
  private glow: Sprite;
  private circle: CircleTriangles;
  private numberGlow: Sprite;
  private number: BitmapText;
  private ring: Sprite;
  private flash: Sprite;

  private initialScale: number;

  public constructor(hitObject: Circle, color: number) {
    super();
    this.hitObject = hitObject;

    this.initialScale = hitObject.scale / 2; // TODO: Why times 2?
    this.scale.set(this.initialScale);

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
  update(timeMs: number) {
    this.circle.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    if (timeRelativeMs >= 0) {
      // Exploding
      // TODO: Add Particles

      // Expand during explosion
      this.scale.set(
        MathUtils.lerpClamped01(timeRelativeMs / SCALE_TIME, 1.0, 1.5) 
          * this.initialScale
      );

      // Flash
      const progressPhase1 = timeRelativeMs / FLASH_IN_TIME;
      if (progressPhase1 < 1) {
        // Phase 1
        this.flash.alpha = MathUtils.clamp01(progressPhase1);
      } else {
        // Phase 2
        this.approachCircle.visible = false;
        this.circle.visible = false;
        this.numberGlow.visible = false;
        this.number.visible = false;
        this.ring.visible = false;
        const progressPhase2 = timeRelativeMs - FLASH_IN_TIME;

        // TODO: Probably slightly incorrect because flash is faded twice
        this.flash.alpha = MathUtils
          .clamp01(1 - progressPhase2 / FLASH_OUT_TIME);
        this.alpha = MathUtils.clamp01(1 - progressPhase2 / FADE_OUT_TIME);
      }
    } else {
      // Entering

      const timeRelativeEnterMs = timeRelativeMs + this.hitObject.timePreempt;

      this.circleContainer.alpha = MathUtils.lerpClamped01(
        timeRelativeEnterMs / this.hitObject.timeFadeIn, 
        0, 
        1
      );

      const approachFadeIn = Math.min(
        this.hitObject.timeFadeIn * 2, 
        this.hitObject.timePreempt
      );

      this.approachContainer.alpha = MathUtils.lerpClamped01(
        timeRelativeEnterMs / approachFadeIn,
        0,
        1
      );

      this.approachContainer.scale.set(
        MathUtils.lerpClamped01(
          timeRelativeEnterMs / this.hitObject.timePreempt, 
          APPROACH_CIRCLE_SCALE_INITIAL, 
          APPROACH_CIRCLE_SCALE_EXIT
        )
      );
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
  }
}
