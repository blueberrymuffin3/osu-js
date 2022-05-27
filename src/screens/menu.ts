import { AbstractScreen } from "./screen";
import { TEXTURE_LOGO, TEXTURES_MENU_BACKGROUND } from "../resources/textures";
import { Application, Sprite } from "pixi.js";
import { SCREEN_SIZE } from "../constants";
import bezier from "bezier-easing";
import { sound } from "@pixi/sound";
import { SOUND_TRACK_TRIANGLES } from "../resources/sounds";
import { lerp } from "../anim";

const crashCurve = bezier(0.9, 0, 1, 0.5);
const fadeCurve = bezier(0.4, 0.95, 1, -0.08);
const beatCurve = bezier(0, 0, 0.53, 1);
const initialScale = 1.8;
const minScale = 0.7;
const maxScale = 0.75;
const fadeInTime = 3000;
const BPM = 160;
const beatInterval = (60 * 1000) / BPM;

export class MenuScreen extends AbstractScreen {
  private background: Sprite;
  private logo: Sprite;
  private msElapsed: number | null = null;

  constructor(app: Application) {
    super(app);

    const backgroundTexture =
      TEXTURES_MENU_BACKGROUND[
        Math.floor(Math.random() * TEXTURES_MENU_BACKGROUND.length)
      ];

    this.background = Sprite.from(backgroundTexture);
    this.background.width = SCREEN_SIZE.width;
    this.background.height = SCREEN_SIZE.height;
    this.contianer.addChild(this.background);

    this.logo = Sprite.from(TEXTURE_LOGO);
    this.logo.anchor.set(0.5);
    this.logo.x = SCREEN_SIZE.width / 2;
    this.logo.y = SCREEN_SIZE.height / 2;
    console.log(this);
    console.log(minScale);
    this.logo.scale.set(minScale);
    this.contianer.addChild(this.logo);

    this.contianer.alpha = 0;

    sound.play(SOUND_TRACK_TRIANGLES, {
      loaded: () => (this.msElapsed = 0),
    });
  }

  protected tick() {
    if (this.msElapsed === null) {
      return;
    }

    this.msElapsed += this.app.ticker.elapsedMS;

    const fadeProgress = Math.min(this.msElapsed / fadeInTime, 1);

    this.contianer.alpha = fadeCurve(fadeProgress);

    if (fadeProgress == 1) {
      const bounceProgress =
        ((this.msElapsed - fadeInTime) % beatInterval) / beatInterval;
      this.logo.scale.set(lerp(beatCurve(bounceProgress), minScale, maxScale));
    } else {
      this.logo.scale.set(
        lerp(crashCurve(fadeProgress), initialScale, minScale)
      );
    }
  }
}
