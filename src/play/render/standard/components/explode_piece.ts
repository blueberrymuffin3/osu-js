import {
  Sprite,
  Texture,
  Mesh,
  MeshMaterial,
  BLEND_MODES,
  Graphics,
} from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { Triangles } from "./triangles";

const MASK = new Graphics()
  .beginFill(0xffffff)
  .drawCircle(0, 0, 128)
  .endFill()
  .geometry;

const TRIANGLE_ALPHA = 0.2;

export class ExplodePiece extends Sprite implements IUpdatable {
  private trianglesGeometry: Triangles;
  private trianglesMask: Graphics;
  private trianglesMesh: Mesh;

  constructor(color: number) {
    super();
    this.anchor.set(0.5);

    this.trianglesGeometry = new Triangles();
    this.trianglesMask = new Graphics(MASK);
    this.trianglesMesh = new Mesh(
      this.trianglesGeometry,
      new MeshMaterial(Texture.WHITE)
    );
    this.trianglesMesh.x = -this.width * 0.5;
    this.trianglesMesh.y = -this.height * 0.5;
    this.trianglesMesh.scale.x = this.width;
    this.trianglesMesh.scale.y = this.height;
    this.trianglesMesh.alpha = TRIANGLE_ALPHA;
    this.trianglesMesh.tint = color;
    this.trianglesMesh.blendMode = BLEND_MODES.ADD;
    this.trianglesMesh.mask = this.trianglesMask;
    this.addChild(this.trianglesMask, this.trianglesMesh);
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}
