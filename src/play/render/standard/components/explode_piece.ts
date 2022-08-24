import {
  Texture,
  Mesh,
  MeshMaterial,
  BLEND_MODES,
} from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { Triangles } from "./triangles";

export class ExplodePiece extends Mesh implements IUpdatable {
  private trianglesGeometry: Triangles;

  constructor(color: number, seed?: number) {
    const geometry = new Triangles(seed);

    super(geometry, new MeshMaterial(Texture.WHITE));

    this.trianglesGeometry = geometry;
    this.tint = color;
    this.alpha = 0;
    this.blendMode = BLEND_MODES.ADD;
  }

  update(timeMs: number) {
    this.trianglesGeometry.update(timeMs)
  }
}