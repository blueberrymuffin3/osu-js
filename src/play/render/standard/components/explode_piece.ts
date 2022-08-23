import {
  Texture,
  Mesh,
  MeshMaterial,
  BLEND_MODES,
  Sprite,
  Graphics,
} from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { Triangles } from "./triangles";

export class ExplodePiece extends Mesh implements IUpdatable {
  private trianglesGeometry: Triangles;

  constructor(color: number, sprite: Sprite, mask: Graphics) {
    const geometry = new Triangles();

    super(geometry, new MeshMaterial(Texture.WHITE));

    this.trianglesGeometry = geometry;
    this.x = -sprite.width * 0.5;
    this.y = -sprite.height * 0.5;
    this.scale.x = sprite.width;
    this.scale.y = sprite.height;
    this.alpha = 0.2;
    this.tint = color;
    this.blendMode = BLEND_MODES.ADD;
    this.mask = mask;
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}