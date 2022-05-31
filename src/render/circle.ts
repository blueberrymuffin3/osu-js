import { Container, Graphics, Application, Sprite } from "pixi.js";
import { diameterFromCs, OSU_HIT_OBJECT_RADIUS } from "../constants";
import { TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW } from "../resources/textures";
import { CircleTriangles } from "./circle_triangles";

export class MainCirclePiece extends Container {
  public constructor(app: Application, color: number, cs: number) {
    super();
    this.scale.set(diameterFromCs(cs) / (2 * OSU_HIT_OBJECT_RADIUS));

    const glow = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW);
    glow.anchor.set(0.5);
    glow.alpha = 0.5;
    glow.tint = color;
    this.addChild(glow);
    
    this.addChild(new CircleTriangles(app, color));

    const ring = new Graphics();
    ring.beginFill(0xffffff);
    ring.drawCircle(0, 0, OSU_HIT_OBJECT_RADIUS * 2);
    ring.endFill();
    ring.beginHole();
    ring.drawCircle(0, 0, OSU_HIT_OBJECT_RADIUS * 2 - 16);
    ring.endHole();
    this.addChild(ring);

  }
}
