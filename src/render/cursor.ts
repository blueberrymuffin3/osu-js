import { EasingFunction } from "bezier-easing";
import { Application, Container, IDestroyOptions, Sprite } from "pixi.js";
import { lerpUnclamped, outElasticHalf, outQuad } from "../anim";
import {
  TEXTURE_CURSOR_INNER,
  TEXTURE_CURSOR_OUTER,
} from "../resources/textures";

const SCALE_DEFAULT = 0.25;
const SCALE_EXPANDED = SCALE_DEFAULT * 1.2;
const SCALE_DURATION = 400;

export class Cursor extends Container {
  private app: Application;
  private inner: Sprite;
  private outer: Sprite;

  private _expanded = false;
  public get expanded() {
    return this._expanded;
  }
  public set expanded(value) {
    if (value != this._expanded) {
      this._expanded = value;
      this.scaleFn = value ? outElasticHalf : outQuad;
      this.scaleStart = this.scaleCurrent;
      this.scaleEnd = value ? SCALE_EXPANDED : SCALE_DEFAULT;
      this.scaleProgress = 0;
    }
  }

  private scaleFn: EasingFunction | null = null;
  private scaleStart: number = SCALE_DEFAULT;
  private scaleEnd: number = SCALE_DEFAULT;
  private scaleCurrent: number = SCALE_DEFAULT;
  private scaleProgress: number = 0;

  private onMouseMove = (e: MouseEvent) => {
    this.visible = true;
    this.position.copyFrom(this.parent.worldTransform.applyInverse(e));
  };
  private onMouseDown = () => {
    this.expanded = true;
  };
  private onMouseUp = () => {
    this.expanded = false;
  };

  constructor(app: Application) {
    super();
    this.app = app;
    this.inner = Sprite.from(TEXTURE_CURSOR_INNER);
    this.inner.anchor.set(0.5);
    this.inner.scale.set(SCALE_DEFAULT);
    this.outer = Sprite.from(TEXTURE_CURSOR_OUTER);
    this.outer.anchor.set(0.5);
    this.outer.scale.set(SCALE_DEFAULT);
    this.addChild(this.outer, this.inner);
    this.visible = false;
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
    app.ticker.add(this.tick, this);
  }

  tick() {
    if (this.scaleFn) {
      this.scaleProgress += this.app.ticker.deltaMS / SCALE_DURATION;
      if (this.scaleProgress >= 1) {
        this.scaleFn = null;
        this.scaleCurrent = this.scaleEnd;
      } else {
        this.scaleCurrent = lerpUnclamped(
          this.scaleFn(this.scaleProgress),
          this.scaleStart,
          this.scaleEnd
        );
      }
      this.outer.scale.set(this.scaleCurrent);
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    this.app.ticker.remove(this.tick, this);
  }
}
