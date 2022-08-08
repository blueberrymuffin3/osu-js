import {
  ALPHA_MODES,
  BufferResource,
  FORMATS,
  MIPMAP_MODES,
  SCALE_MODES,
  Sprite,
  Texture,
} from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { ffmpeg } from "../../../loader/video-loader";

declare global {
  var PIXI_STREAM: {
    width: number;
    height: number;
    data: Uint8Array | null;
    ptsMs: number | null;
    timeMs: Int32Array;
  } | null;
}

export class VideoPlayerFFmpeg extends Sprite implements IUpdatable {
  constructor(videoUrl: string) {
    super();

    ffmpeg
      .run(
        "-hide_banner",
        // "-loglevel",
        // "warning",
        "-i",
        videoUrl,
        "-pix_fmt",
        "rgb24",
        "-f",
        "pixi",
        "-"
      )
      .then(() => this.destroy(true));

    this.texture = Texture.EMPTY;
  }

  update(timeMs: number): void {
    if (window.PIXI_STREAM && this.texture === Texture.EMPTY) {
      if (this.texture === Texture.EMPTY) {
        this.texture = Texture.fromBuffer(
          new Uint8Array(
            window.PIXI_STREAM.width * window.PIXI_STREAM.height * 4
          ),
          window.PIXI_STREAM.width,
          window.PIXI_STREAM.height,
          {
            format: FORMATS.RGB,
            scaleMode: SCALE_MODES.LINEAR,
            mipmap: MIPMAP_MODES.OFF,
            alphaMode: ALPHA_MODES.PREMULTIPLIED_ALPHA,
          }
        );
      }
    }

    if (window.PIXI_STREAM && window.PIXI_STREAM.data) {
      if (Atomics.load(window.PIXI_STREAM.timeMs, 0) === 0) {
        const timeMsRounded = Math.round(timeMs);
        if (timeMsRounded >= window.PIXI_STREAM.ptsMs!) {
          let resource = this.texture.baseTexture.resource as BufferResource;
          resource.data.set(window.PIXI_STREAM.data, 0);
          this.texture.update();

          Atomics.store(window.PIXI_STREAM.timeMs, 0, timeMsRounded);
        }
      }
    } else {
      console.warn("Video stream not yet ready");
    }
  }
}
