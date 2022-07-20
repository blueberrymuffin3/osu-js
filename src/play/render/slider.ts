import { BeatmapDifficultySection } from "osu-classes";
import { Slider } from "osu-standard-stable";
import { BLEND_MODES, Container, Sprite } from "pixi.js";
import { clamp01, lerp } from "../anim";
import { IUpdatable } from "../game/timeline";
import { TEXTURE_SLIDER_BALL } from "../resources/textures";
import { SliderPathSprite } from "./components/slider_path";

export class SliderPiece extends Container implements IUpdatable {
  private preempt: number;
  private fadeIn: number;

  private hitObject: Slider;

  private sliderPathSprite: SliderPathSprite;
  private sliderBallSprite: Sprite;

  // TODO: Remove difficulty references
  public constructor(
    color: number,
    hitObject: Slider,
    difficulty: BeatmapDifficultySection
  ) {
    super();

    this.hitObject = hitObject;
    this.preempt = hitObject.timePreempt;
    this.fadeIn = hitObject.timeFadeIn;

    this.sliderPathSprite = new SliderPathSprite(
      hitObject.path,
      color,
      difficulty
    );

    this.sliderBallSprite = Sprite.from(TEXTURE_SLIDER_BALL);
    this.sliderBallSprite.blendMode = BLEND_MODES.ADD;
    this.sliderBallSprite.anchor.set(0.5);
    this.sliderBallSprite.scale.set(this.hitObject.scale / 2);
    this.sliderBallSprite.visible = false;

    this.addChild(this.sliderPathSprite, this.sliderBallSprite);
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

    this.sliderBallSprite.visible = timeRelativeMs >= 0;
    this.sliderBallSprite.position.copyFrom(
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
  }
}
