import { MeshGeometry } from "pixi.js";
import { MathUtils, FastRandom } from "osu-classes";

// From what i've seen, lazer spawns up to 5-7 triangles per object.
const MIN_TRIANGLE_COUNT = 5;
const MAX_TRIANGLE_COUNT = 7;

const TRIANGLE_SIZE_MIN = 0.10;
const TRIANGLE_SIZE_MAX = 0.50;
const TRIANGLE_SPEED_MIN = 0.00015;
const TRIANGLE_SPEED_MAX = 0.00025;

/**
 * Triangle width & height limits in range from 0 to 1.
 * They are used to prevent triangles from being rendered outside of the object.
 */
const TRIANGLE_MIN_X = -0.25;
const TRIANGLE_MAX_X = 1.25;
const TRIANGLE_MIN_Y = 0.0;
const TRIANGLE_MAX_Y = 1.4;

const SQRT3_2 = Math.sqrt(3) / 2;

export class Triangles extends MeshGeometry {
  private lastTimeMs = NaN;
  private triangleCount: number;
  private trianglePositions: Float32Array;
  private triangleSizes: Float32Array;
  private triangleSpeeds: Float32Array;
  private vertices: Float32Array;
  private random: FastRandom;

  constructor(seed?: number) {
    const random = new FastRandom(seed ?? Date.now());

    const triangleCount = Math.floor(
      MathUtils.map(
        random.nextDouble(),
        0,
        1,
        MIN_TRIANGLE_COUNT,
        MAX_TRIANGLE_COUNT
      )
    );

    const vertices = new Float32Array(triangleCount * 6);
    const index = new Uint16Array(triangleCount * 3);
    for (let i = 0; i < index.length; i++) {
      index[i] = i;
    }

    super(vertices, undefined, index);

    this.trianglePositions = new Float32Array(triangleCount * 2);
    this.triangleSizes = new Float32Array(triangleCount);
    this.triangleSpeeds = new Float32Array(triangleCount);
    this.triangleCount = triangleCount;
    this.vertices = vertices;
    this.random = random;

    this.resetTriangles(seed);
  }

  public resetTriangles(seed?: number) {
    if (seed) this.random = new FastRandom(seed);

    // TODO: Alpha of the triangles should be randomized somehow.
    for (let i = 0; i < this.triangleCount; i++) {
      const size = MathUtils.map(
        this.random.nextDouble(),
        0,
        1,
        TRIANGLE_SIZE_MIN, 
        TRIANGLE_SIZE_MAX
      );

      const speed = MathUtils.map(
        this.random.nextDouble(),
        0,
        1,
        TRIANGLE_SPEED_MIN, 
        TRIANGLE_SPEED_MAX
      );

      const x = MathUtils.map(
        this.random.nextDouble(),
        0,
        1,
        TRIANGLE_MIN_X + size,
        TRIANGLE_MAX_X - size
      );

      const y = MathUtils.map(
        this.random.nextDouble(),
        0, 
        1,
        TRIANGLE_MIN_Y + size,
        TRIANGLE_MAX_Y - size
      );

      this.triangleSizes[i] = size;
      this.triangleSpeeds[i] = speed;
      this.trianglePositions[i * 2] = x;
      this.trianglePositions[i * 2 + 1] = y;
    }

    this.recalculateVertices();
  }

  private recalculateVertices() {
    for (let i = 0; i < this.triangleCount; i++) {
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

    this.lastTimeMs = timeMs;

    if (isNaN(deltaMs)) return;

    for (let i = 0; i < this.triangleCount; i++) {
      const j = i * 2;
      let x = this.trianglePositions[j + 0];
      let y = this.trianglePositions[j + 1];

      y -= deltaMs * this.triangleSpeeds[i];

      this.trianglePositions[j + 0] = x;
      this.trianglePositions[j + 1] = y;
    }

    this.recalculateVertices();
  }
}
