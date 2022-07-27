import { Slider, SliderTick } from "osu-standard-stable";
import { BLEND_MODES, Container, Sprite } from "pixi.js";
import { clamp01, EasingFunctions, lerp } from "../anim";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  IUpdatable,
  TimelineElement,
} from "../game/timeline";
import {
  TEXTURE_FOLLOW_CIRCLE,
  TEXTURE_SLIDER_BALL,
} from "../resources/textures";
import { SliderPathSprite } from "./components/slider_path";
import { SliderTickSprite } from "./components/slider_tick";

const SLIDER_FADE_OUT = 450;

const SLIDER_BODY_FADE_OUT = 40;

const SLIDER_BALL_SCALE_INITIAL = 1;
const SLIDER_BALL_SCALE_EXIT = 1.2;
const SLIDER_BALL_DURATION = 450;
const SLIDER_BALL_FADE_OUT = SLIDER_BALL_DURATION / 4;

const FOLLOW_CIRCLE_SCALE_INITIAL = 1 / 2.4;
const FOLLOW_CIRCLE_SCALE_FULL = 1.0;
const FOLLOW_CIRCLE_DURATION = 300;
const FOLLOW_CIRCLE_FADE_OUT = FOLLOW_CIRCLE_DURATION / 2;

export class SliderPiece extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = Math.max(
    SLIDER_BALL_FADE_OUT,
    FOLLOW_CIRCLE_DURATION
  );

  private preempt: number;
  private fadeIn: number;

  private hitObject: Slider;

  private sliderPathSprite: SliderPathSprite;
  private sliderTicks: DisplayObjectTimeline;
  private follower: Container;
  private sliderBallSprite: Sprite;
  private followCircleSprite: Sprite;

  public constructor(hitObject: Slider, color: number, trackColor: number, borderColor: number) {
    super();

    this.hitObject = hitObject;
    this.preempt = hitObject.timePreempt;
    this.fadeIn = hitObject.timeFadeIn;

    this.sliderPathSprite = new SliderPathSprite(hitObject, trackColor, borderColor);

    this.sliderBallSprite = Sprite.from(TEXTURE_SLIDER_BALL);
    this.sliderBallSprite.blendMode = BLEND_MODES.ADD;
    this.sliderBallSprite.anchor.set(0.5);

    const ticks: TimelineElement<DOTimelineInstance>[] = [];

    for (const object of hitObject.nestedHitObjects) {
      if (object instanceof SliderTick) {
        let startTime = object.startTime - object.timePreempt;
        const endTime = object.startTime;

        ticks.push({
          startTimeMs: startTime,
          endTimeMs: endTime + SliderTickSprite.EXIT_ANIMATION_DURATION,
          build: () => {
            const sprite = new SliderTickSprite(
              color,
              startTime,
              endTime,
              object.scale / 2
            );
            sprite.position.copyFrom(
              object.startPosition.subtract(hitObject.startPosition)
            );
            return sprite;
          },
        });
      }
    }
    this.sliderTicks = new DisplayObjectTimeline(ticks);

    this.followCircleSprite = Sprite.from(TEXTURE_FOLLOW_CIRCLE);
    this.followCircleSprite.blendMode = BLEND_MODES.ADD;
    this.followCircleSprite.tint = 0xffa500;
    this.followCircleSprite.anchor.set(0.5);

    this.follower = new Container();
    this.follower.visible = false;
    this.follower.scale.set(this.hitObject.scale / 2);
    this.follower.addChild(this.sliderBallSprite, this.followCircleSprite);

    this.addChild(this.sliderPathSprite, this.sliderTicks, this.follower);
  }

  update(timeMs: number) {
    this.sliderTicks.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    const enterTime = timeRelativeMs + this.preempt;
    const exitTime = timeRelativeMs - this.hitObject.duration;

    this.alpha =
      lerp(enterTime / this.fadeIn, 0, 1) *
      lerp(exitTime / SLIDER_FADE_OUT, 1, 0);

    this.sliderPathSprite.alpha = lerp(exitTime / SLIDER_BODY_FADE_OUT, 1, 0);
    this.sliderPathSprite.endProp = clamp01(enterTime / this.fadeIn);

    const sliderProgress = clamp01(timeRelativeMs / this.hitObject.duration);
    const sliderProportion = this.hitObject.path.progressAt(
      sliderProgress,
      this.hitObject.spans
    );
    const finalSpan = sliderProgress > 1 - 1 / this.hitObject.spans;

    const sliderActive = timeRelativeMs >= 0;
    this.follower.visible = sliderActive;
    if (sliderActive) {
      this.follower.position.copyFrom(
        this.hitObject.path.positionAt(sliderProportion)
      );

      this.sliderBallSprite.alpha =
        1 - EasingFunctions.OutQuint(exitTime / SLIDER_BALL_FADE_OUT);
      const sliderBallScaleFactor = EasingFunctions.OutQuint(
        exitTime / SLIDER_BALL_DURATION
      );
      this.sliderBallSprite.scale.set(
        lerp(
          sliderBallScaleFactor,
          SLIDER_BALL_SCALE_INITIAL,
          SLIDER_BALL_SCALE_EXIT
        )
      );

      this.followCircleSprite.alpha =
        EasingFunctions.OutQuint(timeRelativeMs / FOLLOW_CIRCLE_DURATION) *
        (1 - EasingFunctions.OutQuint(exitTime / FOLLOW_CIRCLE_FADE_OUT));
      const followCircleScaleFactor =
        EasingFunctions.OutQuint(timeRelativeMs / FOLLOW_CIRCLE_DURATION) *
        (1 - EasingFunctions.OutQuint(exitTime / FOLLOW_CIRCLE_DURATION));
      this.followCircleSprite.scale.set(
        lerp(
          followCircleScaleFactor,
          FOLLOW_CIRCLE_SCALE_INITIAL,
          FOLLOW_CIRCLE_SCALE_FULL
        )
      );
    }

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
