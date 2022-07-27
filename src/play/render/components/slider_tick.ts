import { Container, Sprite } from "pixi.js";
import { EasingFunctions, lerp } from "../../anim";
import { IUpdatable } from "../../game/timeline";
import {
  TEXTURE_SLIDER_TICK_INNER,
  TEXTURE_SLIDER_TICK_OUTER,
} from "../../resources/textures";

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
    this.alpha =
      lerp(enter / FADE_TIME, 0, 1) *
      lerp(EasingFunctions.OutQuint(hit / FADE_TIME), 1, 0);
    this.scale.set(
      lerp(EasingFunctions.OutElasticHalf(enter / SCALE_IN_TIME), SCALE_IN, 1) *
        lerp(EasingFunctions.OutQuad(hit / SCALE_OUT_TIME), 1, SCALE_OUT) *
        this.baseScale
    );
  }
}
