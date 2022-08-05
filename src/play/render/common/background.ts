import { POLICY } from "../adaptive-scale";
import { Sprite, Texture } from "pixi.js";
import { LoadedBeatmap } from "../api/beatmap-loader";
import { adaptiveScaleDisplayObject } from "../constants";
import { IUpdatable } from "./timeline";
import { VIRTUAL_SCREEN } from "./standard_game";

const MAX_VIDEO_SKEW_SPEED = 0.05;
const MAX_VIDEO_SKEW_SEEK = 0.5;

// TODO: Use WebCodecs in supported browsers
export class Background extends Sprite implements IUpdatable {
  private videoStartTime: number | null = null;
  private videoStarted = false;
  private video: HTMLVideoElement | null = null;

  private backgroundTexture: Texture | null = null;

  constructor(beatmap: LoadedBeatmap) {
    super();

    // Dim by a fixed amount
    // TODO: Dim automatically
    this.tint = 0x333333;

    if (beatmap.background) {
      this.texture = beatmap.background;
    }
  }
}
