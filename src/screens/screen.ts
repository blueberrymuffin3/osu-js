import * as PIXI from "pixi.js";
import { Application } from "pixi.js";

export abstract class AbstractScreen {
  protected app: PIXI.Application;
  protected manager: ScreenManager;
  protected contianer: PIXI.Container;

  constructor(app: Application, manager: ScreenManager) {
    this.app = app;
    this.manager = manager;
    this.app.ticker.add(this.tick, this);
    this.contianer = new PIXI.Container();
    this.app.stage.addChild(this.contianer);
  }

  public destroy() {
    this.app.ticker.remove(this.tick, this);
    this.app.stage.removeChild(this.contianer);
    this.contianer.destroy({ children: true, });
  }

  protected abstract tick(): void;
}

export class ScreenManager {
  private current: AbstractScreen | null = null;

  public loadScreen(builder: () => AbstractScreen) {
    if (this.current) {
      this.current.destroy();
    }
    this.current = builder();
  }
}
