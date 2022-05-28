import { Application, Graphics } from "pixi.js";
import { SCREEN_SIZE } from "../constants";
import { AbstractScreen } from "./screen";

const barWidth = 800;
const barHeight = 50;
const borderThickness = 10;
const barRadius = 10;
const padding = 5;
const innerWidth = barWidth + padding * 2;
const innerHeight = barHeight + padding * 2;
const innerRadius = barRadius + padding;
const outerWidth = innerWidth + borderThickness * 2;
const outerHeight = innerHeight + borderThickness * 2;
const outerRadius = innerRadius + borderThickness;

export class LoadingScreen extends AbstractScreen {
  private loadingBar: Graphics;

  constructor(app: Application) {
    super(app);
    this.loadingBar = new Graphics();
    this.loadingBar.x = SCREEN_SIZE.width / 2;
    this.loadingBar.y = SCREEN_SIZE.height / 2;
    this.contianer.addChild(this.loadingBar);
  }

  protected tick(): void {
    const progress = this.app.loader.progress / 100;

    this.loadingBar.clear();
    this.loadingBar.beginFill(0xffffff);
    this.loadingBar.drawRoundedRect(
      -outerWidth / 2,
      -outerHeight / 2,
      outerWidth,
      outerHeight,
      outerRadius
    );
    this.loadingBar.beginFill(0x00000);
    this.loadingBar.drawRoundedRect(
      -innerWidth / 2,
      -innerHeight / 2,
      innerWidth,
      innerHeight,
      innerRadius
    );
    this.loadingBar.beginFill(0xffffff);
    this.loadingBar.drawRoundedRect(
      -barWidth / 2,
      -barHeight / 2,
      barWidth * progress,
      barHeight,
      barRadius
    );
  }

  public destroy(): void {
    this.loadingBar.destroy();
    super.destroy();
  }
}
