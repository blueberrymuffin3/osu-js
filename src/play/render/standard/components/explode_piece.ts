import {
  Texture,
  Mesh,
  MeshMaterial,
  BLEND_MODES,
  Graphics,
} from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { Triangles } from "./triangles";

const TRIANGLE_ALPHA = 0.2;

export class ExplodePiece extends Mesh implements IUpdatable {
  private trianglesGeometry: Triangles;

  constructor(color: number) {
    const geometry = new Triangles();
    
    super(geometry, new MeshMaterial(Texture.WHITE));

    this.trianglesGeometry = geometry;
    this.x = -this.width * 0.5;
    this.y = -this.height * 0.5;
    this.scale.y = this.height;
    this.alpha = TRIANGLE_ALPHA;
    this.tint = color;
    this.blendMode = BLEND_MODES.ADD;
    this.mask = new Graphics()
      .beginFill(0xffffff)
      .drawCircle(0, 0, 128)
      .endFill();
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}
