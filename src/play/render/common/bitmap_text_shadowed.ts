import { BitmapText, Container, IBitmapTextStyle } from "pixi.js";

const SHADOW_OFFSET = 0.06;
const SHADOW_TINT = 0x000000;
const SHADOW_ALPHA = 0.2;

export class BitmapTextShadowed extends Container {
  text: BitmapText;
  shadow: BitmapText;

  public constructor(text: string, style?: Partial<IBitmapTextStyle>) {
    super();
    this.text = new BitmapText(text, style);
    this.shadow = new BitmapText(text, {
      ...style,
      tint: SHADOW_TINT,
    });
    this.shadow.y = this.text.fontSize * SHADOW_OFFSET;
    this.shadow.alpha = SHADOW_ALPHA;
    this.addChild(this.shadow, this.text);
  }

  setAnchor(x: number, y: number = x) {
    this.text.anchor.set(x, y);
    this.shadow.anchor.set(x, y);
  }
}
