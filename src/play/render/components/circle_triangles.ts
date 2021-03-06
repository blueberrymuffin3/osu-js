import {
  Filter,
  Sprite,
  Texture,
  UniformGroup,
  Renderer,
} from "pixi.js";
import { hex2rgb } from "@pixi/utils";
import { lerp } from "../../anim";
import { TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC } from "../../resources/textures";
import TRIANGLES_FS_RAW from "./circle_triangles.frag?raw";
import { IUpdatable } from "../../game/timeline";

const TRIANGLE_COUNT = 20;
const TRIANGLES_FS = TRIANGLES_FS_RAW.replace(
  "__TRIANGLE_COUNT",
  TRIANGLE_COUNT.toString()
);
const TRIANGLE_SIZE_MIN = 0.1;
const TRIANGLE_SIZE_MAX = 0.2;
const TRIANGLE_X_MIN = 0.2;
const TRIANGLE_X_MAX = 1 - TRIANGLE_X_MIN;
const TRIANGLE_SPEED_MIN = 0.0001;
const TRIANGLE_SPEED_MAX = 0.0002;

const uniformGroup = new UniformGroup({
  triangles: new Float32Array(),
  color: [0, 0, 0, 0],
  AA: 0,
});

const filter = new Filter(
  undefined, // Use default vertex shader
  TRIANGLES_FS,
  uniformGroup
);

export class CircleTriangles extends Sprite implements IUpdatable {
  private color: number[];
  private triangles = new Float32Array(TRIANGLE_COUNT * 3);
  private triangleSpeeds = new Float32Array(TRIANGLE_COUNT);
  private lastTimeMs = NaN;

  constructor(color: number) {
    super(Texture.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_DISC));
    this.color = hex2rgb(color) as number[];

    this.filters = [filter];
    // this.width = OSU_HIT_OBJECT_RADIUS * 2;
    // this.height = OSU_HIT_OBJECT_RADIUS * 2;
    this.anchor.set(0.5);

    for (let i = 0; i < TRIANGLE_COUNT; i += 3) {
      const size = lerp(Math.random(), TRIANGLE_SIZE_MIN, TRIANGLE_SIZE_MAX);
      const x = lerp(Math.random(), TRIANGLE_X_MIN, TRIANGLE_X_MAX);
      const y = lerp(Math.random(), -2 * size, 1 + 2 * size);
      const speed = lerp(Math.random(), TRIANGLE_SPEED_MIN, TRIANGLE_SPEED_MAX);

      const j = i * 3;
      this.triangles[j] = x;
      this.triangles[j + 1] = y;
      this.triangles[j + 2] = size;
      this.triangleSpeeds[i] = speed;
    }
  }

  protected _render(renderer: Renderer): void {
    uniformGroup.uniforms.AA = 1 / (this.width * this.worldTransform.a);
    uniformGroup.uniforms.color = this.color;
    uniformGroup.uniforms.triangles = this.triangles;
    super._render(renderer);
  }

  update(timeMs: number) {
    const deltaMs = timeMs - this.lastTimeMs
    this.lastTimeMs = timeMs;

    if(isNaN(deltaMs)){
      return
    }

    for (let i = 0; i < TRIANGLE_COUNT; i++) {
      const j = i * 3;
      let x = this.triangles[j];
      let y = this.triangles[j + 1];
      let size = this.triangles[j + 2];
      y -= deltaMs * this.triangleSpeeds[i];
      if (y < -size * 2) {
        this.triangleSpeeds[i] = lerp(
          Math.random(),
          TRIANGLE_SPEED_MIN,
          TRIANGLE_SPEED_MAX
        );
        size = lerp(Math.random(), TRIANGLE_SIZE_MIN, TRIANGLE_SIZE_MAX);
        y = 1 + size * 2;
        x = lerp(Math.random(), TRIANGLE_X_MIN, TRIANGLE_X_MAX);
      }
      this.triangles[j] = x;
      this.triangles[j + 1] = y;
      this.triangles[j + 2] = size;
    }
  }
}
