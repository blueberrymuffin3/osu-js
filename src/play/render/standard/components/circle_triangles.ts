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

export class CircleTriangles extends Sprite implements IUpdatable {
  private trianglesGeometry: Triangles;
  private trianglesMask: Graphics;
  public trianglesMesh: Mesh;

  constructor(color: number, mask: Graphics, seed?: number) {
    super(Texture.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC));
    this.tint = color;

    this.anchor.set(0.5);

    const geometry = new Triangles(seed);

    this.trianglesGeometry = geometry;
    this.trianglesMask = mask;

    this.trianglesMesh = new Mesh(geometry, new MeshMaterial(Texture.WHITE));
    this.trianglesMesh.x = -this.width * 0.5;
    this.trianglesMesh.y = -this.height * 0.5;
    this.trianglesMesh.scale.x = this.width;
    this.trianglesMesh.scale.y = this.height;
    this.trianglesMesh.alpha = 0.3;
    this.trianglesMesh.tint = color;
    this.trianglesMesh.blendMode = BLEND_MODES.ADD;
    this.trianglesMesh.mask = this.trianglesMask;
    this.addChild(this.trianglesMask, this.trianglesMesh);
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}