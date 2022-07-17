import { BeatmapDifficultySection } from "osu-classes";
import { Slider } from "osu-standard-stable";
import { Application, Container } from "pixi.js";
import { clamp01, lerp } from "../anim";
import { UpdatableDisplayObject } from "../game/timeline";
import { SliderPathSprite } from "./components/slider_path";

export class SliderPiece extends Container implements UpdatableDisplayObject {
  private preempt: number;
  private fadeIn: number;

  private hitObject: Slider;

  private sliderPathSprite: SliderPathSprite;

  // TODO: Remove difficulty and app references
  public constructor(
    app: Application,
    color: number,
    hitObject: Slider,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.hitObject = hitObject;
    this.preempt = hitObject.timePreempt;
    this.fadeIn = hitObject.timeFadeIn;

    this.sliderPathSprite = new SliderPathSprite(
      app,
      hitObject.path,
      color,
      difficulty
    );
    this.addChild(this.sliderPathSprite);
  }

  update(timeMs: number) {
    const timeRelativeMs = timeMs - this.hitObject.startTime;

    const enterTime = timeRelativeMs + this.preempt;

    this.alpha = lerp(enterTime / this.fadeIn, 0, 1);
    this.sliderPathSprite.endProp = clamp01(enterTime / this.fadeIn);

    const sliderProgress = clamp01(timeRelativeMs / this.hitObject.duration);
    const sliderProportion = this.hitObject.path.progressAt(
      sliderProgress,
      this.hitObject.spans
    );
    const finalSpan = sliderProgress > 1 - 1 / this.hitObject.spans;

    if (finalSpan) {
      if (this.hitObject.spans % 2 == 0) {
        this.sliderPathSprite.startProp = 0;
        this.sliderPathSprite.endProp = sliderProportion;
      } else {
        this.sliderPathSprite.startProp = sliderProportion;
        this.sliderPathSprite.endProp = 1;
      }
    }

    // TODO: This should be redundant
    if (sliderProgress == 1) {
      // TODO: Is there any exit animation?
      this.destroy({ children: true });
    }
  }
}
