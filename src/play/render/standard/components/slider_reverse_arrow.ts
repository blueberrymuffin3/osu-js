import { MathUtils, Easing } from "osu-classes";
import { SliderRepeat } from "osu-standard-stable";
import { BLEND_MODES, Sprite, Texture } from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { TEXTURE_SLIDER_REVERSE_ARROW } from "../../../resources/textures";

const SCALE_IN = 0.5;
const SCALE_OUT = 1.5;
const SCALE_FACTOR = 0.6;

const MAX_ANIM_DURATION = 300;

export class SliderReverseArrowSprite extends Sprite implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = MAX_ANIM_DURATION;

  private timeEnter: number;
  private timeHit: number;
  private animDuration: number;
  private baseScale: number;

  constructor(hitObject: SliderRepeat) {
    super(Texture.from(TEXTURE_SLIDER_REVERSE_ARROW));

    this.anchor.set(0.5);
    this.blendMode = BLEND_MODES.ADD;

    this.timeEnter = hitObject.startTime - hitObject.timePreempt;
    this.timeHit = hitObject.startTime;
    this.animDuration = Math.min(MAX_ANIM_DURATION, hitObject.spanDuration);
    this.baseScale = hitObject.scale * SCALE_FACTOR;
  }

  update(timeMs: number): void {
    const enter = timeMs - this.timeEnter;
    const hit = timeMs - this.timeHit;

    const clamp1 = MathUtils
      .lerpClamped01(enter / this.animDuration, 0, 1);
      
    const clamp2 = MathUtils
      .lerpClamped01(Easing.outQuad(hit / this.animDuration), 1, 0);

    this.alpha = clamp1 * clamp2;

    // TODO: "Pulse" slider reverse arrows with the beat
    // See https://github.com/ppy/osu/blob/d590219779fa2f4baec692f09dd7b6b7e3b0996f/osu.Game.Rulesets.Osu/Skinning/Default/ReverseArrowPiece.cs#L47-L51
    const lerp1 = MathUtils.lerpClamped01(
      Easing.outElasticHalf(enter / (this.animDuration * 2)), 
      SCALE_IN, 
      1
    );

    const lerp2 = MathUtils.lerpClamped01(
      Easing.outQuad(hit / this.animDuration), 
      1, 
      SCALE_OUT
    );
    
    this.scale.set(lerp1 * lerp2 * this.baseScale);
  }
}
