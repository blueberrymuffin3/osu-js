import { Container, Sprite } from "pixi.js";
import { MathUtils, Easing } from "osu-classes";
import { IUpdatable } from "../../../game/timeline";
import {
  TEXTURE_SLIDER_TICK_INNER,
  TEXTURE_SLIDER_TICK_OUTER,
} from "../../../resources/textures";

const SCALE_IN = 0.5;
const SCALE_OUT = 1.2;

const FADE_TIME = 150;
const SCALE_OUT_TIME = 150;
const SCALE_IN_TIME = SCALE_OUT_TIME * 4;

export class SliderTickSprite extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = FADE_TIME;

  private innerSprite: Sprite;
  private outerSprite: Sprite;
  private enterTime: number;
  private hitTime: number;
  private baseScale: number;

  constructor(
    color: number,
    enterTime: number,
    hitTime: number,
    scale: number
  ) {
    super();

    this.enterTime = enterTime;
    this.hitTime = hitTime;
    this.baseScale = scale;

    this.innerSprite = Sprite.from(TEXTURE_SLIDER_TICK_INNER);
    this.innerSprite.tint = color;
    this.innerSprite.alpha = 0.3;
    this.innerSprite.anchor.set(0.5);

    this.outerSprite = Sprite.from(TEXTURE_SLIDER_TICK_OUTER);
    this.outerSprite.anchor.set(0.5);

    this.addChild(this.innerSprite, this.outerSprite);
  }

  update(timeMs: number): void {
    const enter = timeMs - this.enterTime;
    const hit = timeMs - this.hitTime;

    const lerp1 = MathUtils.lerpClamped01(enter / FADE_TIME, 0, 1);
    const lerp2 = MathUtils.lerpClamped01(
      Easing.outQuint(hit / FADE_TIME), 
      1, 
      0
    );

    this.alpha = lerp1 * lerp2;
      
    const lerp3 = MathUtils.lerpClamped01(
      Easing.outElasticHalf(enter / SCALE_IN_TIME), 
      SCALE_IN, 
      1
    );

    const lerp4 = MathUtils.lerpClamped01(
      Easing.outQuad(hit / SCALE_OUT_TIME), 
      1, 
      SCALE_OUT
    );

    this.scale.set(lerp3 * lerp4 * this.baseScale);
  }
}
