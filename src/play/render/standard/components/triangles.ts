import { MeshGeometry } from "pixi.js";
import { lerp } from "../../../anim";

const TRIANGLE_COUNT = 10;

const TRIANGLE_SIZE_MIN = 0.2;
const TRIANGLE_SIZE_MAX = 0.4;
const TRIANGLE_X_MIN = 0.2;
const TRIANGLE_X_MAX = 1 - TRIANGLE_X_MIN;
const TRIANGLE_SPEED_MIN = 0.0001;
const TRIANGLE_SPEED_MAX = 0.0002;

const SQRT3_2 = Math.sqrt(3) / 2;

export class Triangles extends MeshGeometry {
  private trianglePositions: Float32Array;
  private triangleSizes: Float32Array;
  private triangleSpeeds: Float32Array;
  private vertices: Float32Array;
  private lastTimeMs = NaN;

  constructor() {
    const vertices = new Float32Array(TRIANGLE_COUNT * 6);
    const index = new Uint16Array(TRIANGLE_COUNT * 3);
    for (let i = 0; i < index.length; i++) {
      index[i] = i;
    }

    super(vertices, undefined, index);
    this.trianglePositions = new Float32Array(TRIANGLE_COUNT * 2);
    this.triangleSizes = new Float32Array(TRIANGLE_COUNT);
    this.triangleSpeeds = new Float32Array(TRIANGLE_COUNT);
    this.vertices = vertices;

    this.resetTriangles();
  }

  public resetTriangles() {
    for (let i = 0; i < TRIANGLE_COUNT; i++) {
      const size = lerp(Math.random(), TRIANGLE_SIZE_MIN, TRIANGLE_SIZE_MAX);
      const x = lerp(Math.random(), TRIANGLE_X_MIN, TRIANGLE_X_MAX);
      const y = lerp(Math.random(), -size, 1 + size);
      const speed = lerp(Math.random(), TRIANGLE_SPEED_MIN, TRIANGLE_SPEED_MAX);

      this.trianglePositions[i * 2] = x;
      this.trianglePositions[i * 2 + 1] = y;
      this.triangleSizes[i] = size;
      this.triangleSpeeds[i] = speed;
    }

    this.recalculateVertices();
  }

  private recalculateVertices() {
    for (let i = 0; i < TRIANGLE_COUNT; i++) {
      const j = i * 2;
      const x = this.trianglePositions[j + 0];
      const y = this.trianglePositions[j + 1];
      const size = this.triangleSizes[i];

      const dy1 = size;
      const dx2 = size * SQRT3_2;
      const dy2 = size * 0.5;

      const k = i * 6;
      this.vertices[k + 0] = x;
      this.vertices[k + 1] = y - dy1;
      this.vertices[k + 2] = x + dx2;
      this.vertices[k + 3] = y + dy2;
      this.vertices[k + 4] = x - dx2;
      this.vertices[k + 5] = y + dy2;
    }

    // Mark vertices as dirty, forcing a re-upload
    this.buffers[0]._updateID++;
  }

  update(timeMs: number) {
    const deltaMs = timeMs - this.lastTimeMs;
    const forward = deltaMs >= 0;
    this.lastTimeMs = timeMs;

    if (isNaN(deltaMs)) {
      return;
    }

    for (let i = 0; i < TRIANGLE_COUNT; i++) {
      const j = i * 2;
      let x = this.trianglePositions[j + 0];
      let y = this.trianglePositions[j + 1];
      let size = this.triangleSizes[i];
      y -= deltaMs * this.triangleSpeeds[i];
      if (forward ? y < -size : y > 1 + size) {
        this.triangleSpeeds[i] = lerp(
          Math.random(),
          TRIANGLE_SPEED_MIN,
          TRIANGLE_SPEED_MAX
        );
        y = forward ? 1 + size : -size;
        x = lerp(Math.random(), TRIANGLE_X_MIN, TRIANGLE_X_MAX);
      }
      this.trianglePositions[j + 0] = x;
      this.trianglePositions[j + 1] = y;
    }

    this.recalculateVertices();
  }
}
