import { Sprite } from "pixi.js";
import { POLICY } from "../../adaptive-scale";
import { LoadedBeatmap } from "../../api/beatmap-loader";
import { adaptiveScaleDisplayObject, VIRTUAL_SCREEN } from "../../constants";

export class Background extends Sprite {
  constructor(beatmap: LoadedBeatmap) {
    super();

    // Dim by a fixed amount
    // TODO: Dim automatically
    this.tint = 0x333333;

    if (!beatmap.background) return;

    this.texture = beatmap.background;

    adaptiveScaleDisplayObject(
      VIRTUAL_SCREEN,
      this.texture,
      this,
      POLICY.ExactFit
    );
  }
}
