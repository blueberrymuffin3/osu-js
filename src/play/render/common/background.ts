import { Sprite, utils } from "pixi.js";
import { POLICY } from "../../adaptive-scale";
import { LoadedBeatmap } from "../../api/beatmap-loader";
import { adaptiveScaleDisplayObject, STORYBOARD_BRIGHTNESS, VIRTUAL_SCREEN } from "../../constants";

export class Background extends Sprite {
  constructor(beatmap: LoadedBeatmap) {
    super();

    this.tint = utils.rgb2hex([
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
    ]);

    if (!beatmap.background) return;

    this.texture = beatmap.background;

    adaptiveScaleDisplayObject(
      VIRTUAL_SCREEN,
      this.texture,
      this,
      POLICY.FullWidth
    );
  }
}
