import { AbstractScreen, ScreenManager } from "./screen";
import { Application, filters } from "pixi.js";
import { MainCirclePiece } from "../render/circle";
import { TEXTURE_PIXELS_SCREEN_SIZE } from "../constants";

export class RenderTestScreen extends AbstractScreen {
  private filter = new filters.FXAAFilter();

  constructor(app: Application, manager: ScreenManager) {
    super(app, manager);
    this.contianer.filters = [this.filter];


    for (let i = 1; i <= 10; i++) {
      const circle1 = new MainCirclePiece(app, 0x4fe90d, 4);
      const circle2 = new MainCirclePiece(app, 0xffffff, 4);

      circle1.x = (TEXTURE_PIXELS_SCREEN_SIZE.width / 11) * i + Math.random() * 50;
      circle1.y = TEXTURE_PIXELS_SCREEN_SIZE.height / 3 + Math.random() * 200;

      circle2.x = (TEXTURE_PIXELS_SCREEN_SIZE.width / 11) * i + Math.random() * 50;
      circle2.y = (TEXTURE_PIXELS_SCREEN_SIZE.height / 3) * 2 + Math.random() * 200;

      this.contianer.addChild(circle1);
      this.contianer.addChild(circle2);
    }
  }

  protected tick() {}

  public destroy(): void {
    super.destroy();
  }
}
