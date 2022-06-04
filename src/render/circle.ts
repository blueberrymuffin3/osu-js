import { BeatmapDifficultySection } from "osu-classes";
import {
  Container,
  Application,
  Sprite,
  IDestroyOptions,
} from "pixi.js";
import { lerp } from "../anim";
import {
  diameterFromCs,
  fadeInTimeFromAr,
  OSU_HIT_OBJECT_RADIUS,
  preemtTimeFromAr,
  TimeMsProvider,
} from "../constants";
import {
  TEXTURE_OSU_RING,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE,
  TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW,
} from "../resources/textures";
import { CircleTriangles } from "./components/circle_triangles";

export class CirclePiece extends Container {
  private app: Application;
  private clock: TimeMsProvider;
  private startTime: number;
  private preempt: number;
  private fadeIn: number;

  private approachCircle: Sprite;

  public constructor(
    app: Application,
    clock: TimeMsProvider,
    startTime: number,
    color: number,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.app = app;
    this.clock = clock;
    this.startTime = startTime;
    this.preempt = preemtTimeFromAr(difficulty.approachRate);
    this.fadeIn = fadeInTimeFromAr(difficulty.approachRate);

    this.scale.set(
      diameterFromCs(difficulty.circleSize) / (2 * OSU_HIT_OBJECT_RADIUS)
    );

    const glow = Sprite.from(TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_RING_GLOW);
    glow.anchor.set(0.5);
    glow.alpha = 0.5;
    glow.tint = color;
    this.addChild(glow);

    this.addChild(new CircleTriangles(app, color));

    const ring = Sprite.from(TEXTURE_OSU_RING);
    ring.anchor.set(0.5);
    this.addChild(ring);

    this.approachCircle = Sprite.from(
      TEXTURE_SKIN_DEFAULT_GAMEPLAY_OSU_APPROACH_CIRCLE
    );
    this.approachCircle.anchor.set(0.5);
    this.approachCircle.tint = color;
    this.addChild(this.approachCircle);

    app.ticker.add(this.tick, this);
  }

  tick() {
    const progress = this.clock() - (this.startTime - this.preempt);

    this.alpha = lerp(progress / this.fadeIn, 0, 1);
    this.approachCircle.scale.set(lerp(progress / this.preempt, 4, 1));
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
