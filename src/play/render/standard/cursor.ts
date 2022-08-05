import { EasingFunction } from "bezier-easing";
import { Container, Sprite } from "pixi.js";
import { EasingFunctions, lerpUnclamped } from "../../anim";
import { IUpdatable } from "../../game/timeline";
import {
  TEXTURE_CURSOR_INNER,
  TEXTURE_CURSOR_OUTER,
} from "../../resources/textures";

const SCALE_DEFAULT = 0.25;
const SCALE_EXPANDED = SCALE_DEFAULT * 1.2;
const SCALE_DURATION = 400;

export class Cursor extends Container implements IUpdatable {
  private inner: Sprite;
  private outer: Sprite;

  private _expanded = false;
  public get expanded() {
    return this._expanded;
  }
  public set expanded(value) {
    if (value != this._expanded) {
      this._expanded = value;
      this.scaleFn = value
        ? EasingFunctions.OutElasticHalf
        : EasingFunctions.OutQuad;
      this.scaleStart = this.scaleCurrent;
      this.scaleEnd = value ? SCALE_EXPANDED : SCALE_DEFAULT;
      this.scaleStartTimeMs = NaN;
    }
  }

  private scaleFn: EasingFunction | null = null;
  private scaleStart: number = SCALE_DEFAULT;
  private scaleEnd: number = SCALE_DEFAULT;
  private scaleCurrent: number = SCALE_DEFAULT;
  private scaleStartTimeMs: number = NaN;

  constructor() {
    super();
    this.inner = Sprite.from(TEXTURE_CURSOR_INNER);
    this.inner.anchor.set(0.5);
    this.inner.scale.set(SCALE_DEFAULT);
    this.outer = Sprite.from(TEXTURE_CURSOR_OUTER);
    this.outer.anchor.set(0.5);
    this.outer.scale.set(SCALE_DEFAULT);
    this.addChild(this.outer, this.inner);
  }

  update(timeMs: number) {
    if (this.scaleFn) {
      if (isNaN(this.scaleStartTimeMs)) {
        this.scaleStartTimeMs = timeMs;
      }

      const scaleProgress = (timeMs - this.scaleStartTimeMs) / SCALE_DURATION;
      if (scaleProgress >= 1) {
        this.scaleFn = null;
        this.scaleCurrent = this.scaleEnd;
      } else {
        this.scaleCurrent = lerpUnclamped(
          this.scaleFn(scaleProgress),
          this.scaleStart,
          this.scaleEnd
        );
      }
      this.outer.scale.set(this.scaleCurrent);
    }
  }
}
