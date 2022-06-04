import { AbstractScreen, ScreenManager } from "./screen";
import { TEXTURE_LOGO, TEXTURES_MENU_BACKGROUND } from "../resources/textures";
import { Application, Sprite } from "pixi.js";
import { TEXTURE_PIXELS_SCREEN_SIZE } from "../constants";
import bezier from "bezier-easing";
import { IMediaInstance, Sound } from "@pixi/sound";
import { lerp } from "../anim";
import { LoadedBeatmap } from "../api/beatmap-loader";

const crashCurve = bezier(0.9, 0, 1, 0.5);
const fadeCurve = bezier(0.4, 0.95, 1, -0.08);
const beatCurve = bezier(0, 0, 0.53, 1);
const initialScale = 1.8;
const minScale = 0.7;
const maxScale = 0.72;
const fadeInTime = 3;

export class MenuScreen extends AbstractScreen {
  private background: Sprite;
  private logo: Sprite;
  private BPM: number;
  private beatInterval: number;
  private sound: Sound | null = null;
  private mediaInstance: IMediaInstance | null = null;

  constructor(
    app: Application,
    manager: ScreenManager,
    beatmap: LoadedBeatmap
  ) {
    super(app, manager);

    this.BPM = beatmap.data.bpmMax;
    this.beatInterval = 60 / this.BPM;

    const backgroundTexture =
      TEXTURES_MENU_BACKGROUND[
        Math.floor(Math.random() * TEXTURES_MENU_BACKGROUND.length)
      ];

    this.background = Sprite.from(backgroundTexture);
    this.background.width = TEXTURE_PIXELS_SCREEN_SIZE.width;
    this.background.height = TEXTURE_PIXELS_SCREEN_SIZE.height;
    this.container.addChild(this.background);

    this.logo = Sprite.from(TEXTURE_LOGO);
    this.logo.anchor.set(0.5);
    this.logo.x = TEXTURE_PIXELS_SCREEN_SIZE.width / 2;
    this.logo.y = TEXTURE_PIXELS_SCREEN_SIZE.height / 2;
    this.logo.scale.set(minScale);
    this.container.addChild(this.logo);

    this.container.alpha = 0;

    (async () => {
      this.sound = Sound.from(beatmap.audioData);
      this.mediaInstance = await this.sound.play();
    })();
  }

  protected tick() {
    if (!this.mediaInstance || !this.sound) {
      return;
    }

    const msElapsed = this.mediaInstance.progress * this.sound.duration;

    const fadeProgress = Math.min(msElapsed / fadeInTime, 1);

    this.container.alpha = fadeCurve(fadeProgress);

    if (fadeProgress == 1) {
      const bounceProgress =
        (msElapsed % this.beatInterval) / this.beatInterval;
      this.logo.scale.set(lerp(beatCurve(bounceProgress), minScale, maxScale));
    } else {
      this.logo.scale.set(
        lerp(crashCurve(fadeProgress), initialScale, minScale)
      );
    }
  }
}
