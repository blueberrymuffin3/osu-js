import { Slider, Spinner, StandardHitObject } from "osu-standard-stable";
import { Container, Sprite, Texture } from "pixi.js";
import { MathUtils } from "osu-classes";
import { OSU_PIXELS_SCREEN_WIDESCREEN } from "../../constants";
import { IUpdatable } from "../../game/timeline";
import { LoadedBeatmap } from "../../loader/util";

const GRANULARITY = 200;
// TODO: This should be 6 according to https://github.com/ppy/osu/blob/f30d68cd4e1078ef009618e9b258aed2c8f3d9a8/osu.Game/Screens/Play/SquareGraph.cs#L188-L190, but I measured it to actually be about 3.75
const SQUARE_SPACING_MEASURED = 3.75;
const SQUARE_SIZE = SQUARE_SPACING_MEASURED * (4 / 6);
const ROWS = 6;
const COLUMNS = Math.ceil(
  OSU_PIXELS_SCREEN_WIDESCREEN.width / SQUARE_SPACING_MEASURED
);

const COLOR_EMPTY = 0xffffff;
const COLOR_DIM = 0xffffff;
const COLOR_LIT = 0xd5ecf3;

const ALPHA_EMPTY = Math.pow(20 / 255, 2.2);
const ALPHA_DIM = Math.pow(140 / 255, 2.2);
const ALPHA_LIT = Math.pow(1, 2.2);

/**
 * See https://github.com/ppy/osu/blob/master/osu.Game/Screens/Play/HUD/SongProgressGraph.cs
 * TODO: Is it possible to use a ParticleContainer?
 */
export class SongProgressGraph extends Container implements IUpdatable {
  private squares: Sprite[] = new Array(ROWS * COLUMNS);
  private values!: Int32Array;
  private firstHit!: number;
  private lastHit!: number;
  private lastUpdateColumnsLit = NaN;

  public constructor({ data }: LoadedBeatmap) {
    super();
    this.x = OSU_PIXELS_SCREEN_WIDESCREEN.left;
    this.y = OSU_PIXELS_SCREEN_WIDESCREEN.bottom;

    this.calculateGraphData(data.hitObjects);
    this.generateSquares();
    this.update(-Infinity);
  }

  private getHitObjectEndTime(hitObject: StandardHitObject) {
    if (hitObject instanceof Slider || hitObject instanceof Spinner) {
      return hitObject.endTime;
    } else {
      return hitObject.startTime;
    }
  }

  private calculateGraphData(hitObjects: StandardHitObject[]) {
    if (hitObjects.length === 0) {
      console.warn("No hit objects detected");
      this.firstHit = 0;
      this.lastHit = 1000;
      return;
    }

    this.firstHit = hitObjects.reduce<number>(
      (accumulator, hitObject) => Math.min(accumulator, hitObject.startTime),
      Infinity
    );
    this.lastHit = hitObjects.reduce<number>(
      (accumulator, hitObject) =>
        Math.max(accumulator, this.getHitObjectEndTime(hitObject)),
      -Infinity
    );

    const rawValues = new Int32Array(GRANULARITY);

    const interval = (this.lastHit - this.firstHit) / GRANULARITY;
    for (const hitObject of hitObjects) {
      const iStart = Math.floor(
        (hitObject.startTime - this.firstHit) / interval
      );
      const iEnd = Math.floor(
        (this.getHitObjectEndTime(hitObject) - this.firstHit) / interval
      );

      for (let i = iStart; i <= iEnd; i++) {
        rawValues[i]++;
      }
    }

    this.values = new Int32Array(COLUMNS);
    const max = rawValues.reduce((a, b) => Math.max(a, b));
    for (let i = 0; i < COLUMNS; i++) {
      const iRaw = Math.floor((i / COLUMNS) * GRANULARITY);
      this.values[i] = Math.floor((rawValues[iRaw] / max) * ROWS);
    }
  }

  private generateSquares() {
    for (let x = 0; x < COLUMNS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const sprite = Sprite.from(Texture.WHITE);
        sprite.anchor.set(0, 1);
        sprite.width = SQUARE_SIZE;
        sprite.height = SQUARE_SIZE;
        sprite.x = x * SQUARE_SPACING_MEASURED;
        sprite.y = -y * SQUARE_SPACING_MEASURED;
        sprite.alpha = ALPHA_EMPTY;
        sprite.tint = COLOR_EMPTY;
        this.squares[x * ROWS + y] = sprite;
        this.addChild(sprite);
      }
    }
  }

  public update(timeMs: number) {
    const clamp = MathUtils
      .clamp01((timeMs - this.firstHit) / (this.lastHit - this.firstHit));
    const columnsLit = Math.ceil(clamp * COLUMNS);
    
    if (columnsLit == this.lastUpdateColumnsLit) {
      return;
    }

    for (let x = 0; x < COLUMNS; x++) {
      const height = this.values[x];
      const lit = x < columnsLit;
      for (let y = 0; y < height; y++) {
        this.squares[x * ROWS + y].alpha = lit ? ALPHA_LIT : ALPHA_DIM;
        this.squares[x * ROWS + y].tint = lit ? COLOR_LIT : COLOR_DIM;
      }
    }

    this.lastUpdateColumnsLit = columnsLit;
  }
}
