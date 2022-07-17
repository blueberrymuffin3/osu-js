import { BeatmapDifficultySection } from "osu-classes";
import { Slider } from "osu-standard-stable";
import { Application, Container, IDestroyOptions } from "pixi.js";
import { clamp01, lerp } from "../anim";
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
  private preempt: number;
  private fadeIn: number;

  private hitObject: Slider;

  private sliderPathSprite: SliderPathSprite;
  private circlePiece: CirclePiece;

  public constructor(
    app: Application,
    clock: TimeMsProvider,
    color: number,
    label: string,
    hitObject: Slider,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.app = app;
    this.clock = clock;
    this.hitObject = hitObject;
    this.preempt = preemtTimeFromAr(difficulty.approachRate);
    this.fadeIn = fadeInTimeFromAr(difficulty.approachRate);

    app.ticker.add(this.tick, this);

    this.sliderPathSprite = new SliderPathSprite(
      app,
      hitObject.path,
      color,
      difficulty
    );
    this.circlePiece = new CirclePiece(
      app,
      clock,
      hitObject.startTime,
      color,
      label,
      difficulty
    );
    this.addChild(this.sliderPathSprite, this.circlePiece);
  }

  tick() {
    const sliderTime = this.clock() - this.hitObject.startTime;

    const enterTime = sliderTime + this.preempt;

    this.alpha = lerp(enterTime / this.fadeIn, 0, 1);
    this.sliderPathSprite.endProp = clamp01(enterTime / this.fadeIn);

    const sliderProgress = clamp01(sliderTime / this.hitObject.duration);
    const sliderProportion = this.hitObject.path.progressAt(
      sliderProgress,
      this.hitObject.spans
    );
    const finalSpan = sliderProgress > 1 - 1 / this.hitObject.spans;

    this.circlePiece.position.copyFrom(
      this.hitObject.path.positionAt(sliderProportion)
    );

    if (finalSpan) {
      if (this.hitObject.spans % 2 == 0) {
        this.sliderPathSprite.startProp = 0;
        this.sliderPathSprite.endProp = sliderProportion;
      } else {
        this.sliderPathSprite.startProp = sliderProportion;
        this.sliderPathSprite.endProp = 1;
      }
    }

    if (sliderProgress == 1) {
      this.destroy({ children: true });
    }
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}
