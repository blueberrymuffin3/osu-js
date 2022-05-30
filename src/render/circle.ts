import { Container, Graphics, Sprite, Application } from "pixi.js";
import { OSU_HIT_OBJECT_RADIUS } from "../constants";
import { TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC } from "../resources/textures";
import { CircleTriangles } from "./circle_triangles";

const circleMask = new Graphics();
circleMask.beginFill(0xffffff);
circleMask.drawCircle(0, 0, 235);
circleMask.endFill();
circleMask.renderable = false;

export class MainCirclePiece extends Container {
  public constructor(app: Application, color: number) {
    super();
    this.addChild(new CircleTriangles(app, color));
  }
}
