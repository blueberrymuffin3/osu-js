import { Container, Graphics, Application } from "pixi.js";
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
