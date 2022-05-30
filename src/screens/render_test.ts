import { AbstractScreen, ScreenManager } from "./screen";
import { Application, filters } from "pixi.js";
import { MainCirclePiece } from "../render/circle";
import { SCREEN_SIZE } from "../constants";

const CS = (cs: number) => (109 - 9 * cs) / 91;

export class RenderTestScreen extends AbstractScreen {
  private filter = new filters.FXAAFilter();

  constructor(app: Application, manager: ScreenManager) {
    super(app, manager);
    app.stage.filters = [this.filter];

    const scale = CS(4);

    for (let i = 1; i <= 10; i++) {
      const circle1 = new MainCirclePiece(app, 0x4fe90d);
      const circle2 = new MainCirclePiece(app, 0xffffff);

      circle1.x = (SCREEN_SIZE.width / 11) * i + Math.random() * 50;
      circle1.y = SCREEN_SIZE.height / 3 + Math.random() * 200;
      circle1.scale.set(scale);

      circle2.x = (SCREEN_SIZE.width / 11) * i + Math.random() * 50;
      circle2.y = (SCREEN_SIZE.height / 3) * 2 + Math.random() * 200;
      circle2.scale.set(CS(4) / CS(2));

      this.contianer.addChild(circle1);
      this.contianer.addChild(circle2);
    }
  }

  protected tick() {}

  public destroy(): void {
    super.destroy();
    this.app.stage.filters = null;
  }
}
