import { BeatmapDifficultySection, SliderPath } from "osu-classes";
import { Application, Container, IDestroyOptions } from "pixi.js";
import { lerp } from "../anim";
import {
  fadeInTimeFromAr,
  preemtTimeFromAr,
  TimeMsProvider,
} from "../constants";
import { CirclePiece } from "./circle";
import { SliderPathSprite } from "./components/slider_path";

export class SliderPiece extends Container {
  private app: Application;
  private clock: TimeMsProvider;
  private startTime: number;
  private preempt: number;
  private fadeIn: number;

  private sliderPathSprite: SliderPathSprite;
  private circlePiece: CirclePiece;

  public constructor(
    app: Application,
    clock: TimeMsProvider,
    startTime: number,
    color: number,
    sliderPath: SliderPath,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.app = app;
    this.clock = clock;
    this.startTime = startTime;
    this.preempt = preemtTimeFromAr(difficulty.approachRate);
    this.fadeIn = fadeInTimeFromAr(difficulty.approachRate);

    this.sliderPathSprite = new SliderPathSprite(app, sliderPath, color, difficulty);
    this.circlePiece = new CirclePiece(app, clock, startTime, color, difficulty)
    this.addChild(this.sliderPathSprite, this.circlePiece);

    app.ticker.add(this.tick, this);
  }

  tick() {
    const progress = this.clock() - (this.startTime - this.preempt);

    this.alpha = lerp(progress / this.fadeIn, 0, 1);
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
