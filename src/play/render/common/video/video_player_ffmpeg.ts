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

const BYTES_PER_PIXEL = 3;
const LINE_ALIGNMENT = 4;

export class VideoPlayerFFmpeg extends Sprite implements IUpdatable {
  // null means no alignment is needed
  private lineSizeBytes: number | null = null;

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
        let lineSizeBytes = window.PIXI_STREAM.width * BYTES_PER_PIXEL;

        if (lineSizeBytes % LINE_ALIGNMENT !== 0) {
          lineSizeBytes =
            lineSizeBytes + LINE_ALIGNMENT - (lineSizeBytes % LINE_ALIGNMENT);
          // Manual alignment is needed
          this.lineSizeBytes = lineSizeBytes;
        }

        this.texture = Texture.fromBuffer(
          new Uint8Array(lineSizeBytes * window.PIXI_STREAM.height),
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

          if (this.lineSizeBytes === null) {
            // Pixel data is already properly aligned
            resource.data.set(window.PIXI_STREAM.data, 0);
          } else {
            // Pixel data must be aligned manually
            const lineSizeFF = window.PIXI_STREAM.width * BYTES_PER_PIXEL;
            for (let line = 0; line < window.PIXI_STREAM.height; line++) {
              resource.data.set(
                window.PIXI_STREAM.data.subarray(
                  lineSizeFF * line,
                  lineSizeFF * (line + 1)
                ),
                line * this.lineSizeBytes
              );
            }
          }

          this.texture.update();

          Atomics.store(window.PIXI_STREAM.timeMs, 0, timeMsRounded);
        }
      }
    } else {
      console.warn("Video stream not yet ready");
    }
  }
}
