import {
  Sprite,
  Texture,
  Mesh,
  MeshMaterial,
  BLEND_MODES,
  Graphics,
} from "pixi.js";
import { TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC } from "../../../resources/textures";
import { IUpdatable } from "../../../game/timeline";
import { Triangles } from "./triangles";
import { MathUtils } from "osu-classes";

const _MASK = new Graphics();
_MASK.beginFill(0xffffff);
_MASK.drawCircle(0, 0, 128);
_MASK.endFill();

const MASK = _MASK.geometry;

const MIN_TRIANGLE_ALPHA = 0.18;
const MAX_TRIANGLE_ALPHA = 0.23;

export class CircleTriangles extends Sprite implements IUpdatable {
  private trianglesGeometry: Triangles;
  private trianglesMask: Graphics;
  private trianglesMesh: Mesh;

  constructor(color: number) {
    super(Texture.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC));
    this.tint = color;

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
    this.trianglesMesh.alpha = MathUtils.clamp(
      Math.random(), 
      MIN_TRIANGLE_ALPHA, 
      MAX_TRIANGLE_ALPHA
    );
    this.trianglesMesh.tint = color;
    this.trianglesMesh.blendMode = BLEND_MODES.ADD;
    this.trianglesMesh.mask = this.trianglesMask;
    this.addChild(this.trianglesMask, this.trianglesMesh);
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}
