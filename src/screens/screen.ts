import * as PIXI from "pixi.js";

export abstract class AbstractScreen {
  protected app: PIXI.Application;
  protected contianer: PIXI.Container;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.app.ticker.add(this.tick, this);
    this.contianer = new PIXI.Container();
    this.app.stage.addChild(this.contianer);
  }

  public destroy() {
    this.app.ticker.remove(this.tick, this);
    this.app.stage.removeChild(this.contianer);
  }

  protected abstract tick(): void;
}
