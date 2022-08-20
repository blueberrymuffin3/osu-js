import { ControlPointInfo, HitObject, SliderPath, Vector2 } from "osu-classes";
import { Slider, SliderRepeat, SliderTick } from "osu-standard-stable";
import { BLEND_MODES, Container, Sprite } from "pixi.js";
import { MathUtils, Easing } from "osu-classes";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  IUpdatable,
  TimelineElement,
} from "../../game/timeline";
import {
  TEXTURE_FOLLOW_CIRCLE,
  TEXTURE_SLIDER_BALL,
} from "../../resources/textures";
import { SliderPathSprite } from "./components/slider_path";
import { SliderReverseArrowSprite } from "./components/slider_reverse_arrow";
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

const FLOAT_EPSILON = 1e-3;

function sliderAngle(sliderPath: SliderPath, atStart: boolean) {
  const path = sliderPath.path;
  if (!atStart) {
    path.reverse();
  }
  let delta: Vector2 | null = null;
  const position1 = path[0];

  for (let index = 1; index < path.length; index++) {
    const position2 = path[index];
    delta = position2.subtract(position1);
    
    if (
      Math.abs(delta.x) >= FLOAT_EPSILON ||
      Math.abs(delta.y) >= FLOAT_EPSILON
    ) {
      break;
    }
  }

  if (!delta) {
    console.warn("Path only has 1 point");
    return 0;
  }

  return Math.atan2(delta.y, delta.x) * (180 / Math.PI);
}

export class SliderPiece extends Container implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = Math.max(
    SLIDER_BALL_FADE_OUT,
    FOLLOW_CIRCLE_DURATION
  );

  private preempt: number;
  private fadeIn: number;

  private slider: Slider;
  private controlPoints: ControlPointInfo;
  private accentColor: number;

  private sliderPathSprite: SliderPathSprite;
  private nestedDisplayObjectsTimeline: DisplayObjectTimeline;
  private follower: Container;
  private sliderBallSprite: Sprite;
  private followCircleSprite: Sprite;

  public constructor(
    slider: Slider,
    controlPoints: ControlPointInfo,
    accentColor: number,
    trackColor: number,
    borderColor: number
  ) {
    super();

    this.slider = slider;
    this.preempt = slider.timePreempt;
    this.fadeIn = slider.timeFadeIn;
    this.controlPoints = controlPoints;
    this.accentColor = accentColor;

    this.sliderPathSprite = new SliderPathSprite(
      slider,
      trackColor,
      borderColor
    );

    this.sliderBallSprite = Sprite.from(TEXTURE_SLIDER_BALL);
    this.sliderBallSprite.blendMode = BLEND_MODES.ADD;
    this.sliderBallSprite.anchor.set(0.5);

    const nestedDisplayObjects: TimelineElement<DOTimelineInstance>[] = [];

    for (const nestedHitObject of slider.nestedHitObjects) {
      const created = this.createNestedObject(nestedHitObject);

      if (!created) continue;

      nestedDisplayObjects.push(created);
    }

    this.nestedDisplayObjectsTimeline = new DisplayObjectTimeline(
      nestedDisplayObjects
    );

    this.followCircleSprite = Sprite.from(TEXTURE_FOLLOW_CIRCLE);
    this.followCircleSprite.blendMode = BLEND_MODES.ADD;
    this.followCircleSprite.tint = 0xffa500;
    this.followCircleSprite.anchor.set(0.5);

    this.follower = new Container();
    this.follower.visible = false;
    this.follower.scale.set(this.slider.scale / 2);
    this.follower.addChild(this.sliderBallSprite, this.followCircleSprite);

    this.addChild(
      this.sliderPathSprite,
      this.nestedDisplayObjectsTimeline,
      this.follower
    );
  }

  update(timeMs: number) {
    this.nestedDisplayObjectsTimeline.update(timeMs);

    const timeRelativeMs = timeMs - this.slider.startTime;

    const enterTime = timeRelativeMs + this.preempt;
    const exitTime = timeRelativeMs - this.slider.duration;

    this.alpha =
      MathUtils.lerpClamped01(enterTime / this.fadeIn, 0, 1) *
      MathUtils.lerpClamped01(exitTime / SLIDER_FADE_OUT, 1, 0);

    this.sliderPathSprite.alpha = MathUtils.lerpClamped01(
      exitTime / SLIDER_BODY_FADE_OUT,
      1,
      0
    );
    this.sliderPathSprite.endProp = MathUtils.clamp01(enterTime / this.fadeIn);

    const sliderProgress = MathUtils.clamp01(
      timeRelativeMs / this.slider.duration
    );
    const sliderProportion = this.slider.path.progressAt(
      sliderProgress,
      this.slider.spans
    );
    const finalSpan = sliderProgress > 1 - 1 / this.slider.spans;

    const sliderActive = timeRelativeMs >= 0;
    this.follower.visible = sliderActive;
    if (sliderActive) {
      this.follower.position.copyFrom(
        this.slider.path.positionAt(sliderProportion)
      );

      this.sliderBallSprite.alpha =
        1 - Easing.outQuint(exitTime / SLIDER_BALL_FADE_OUT);
      const sliderBallScaleFactor = Easing.outQuint(
        exitTime / SLIDER_BALL_DURATION
      );
      this.sliderBallSprite.scale.set(
        MathUtils.lerpClamped01(
          sliderBallScaleFactor,
          SLIDER_BALL_SCALE_INITIAL,
          SLIDER_BALL_SCALE_EXIT
        )
      );

      this.followCircleSprite.alpha =
        Easing.outQuint(timeRelativeMs / FOLLOW_CIRCLE_DURATION) *
        (1 - Easing.outQuint(exitTime / FOLLOW_CIRCLE_FADE_OUT));
      const followCircleScaleFactor =
        Easing.outQuint(timeRelativeMs / FOLLOW_CIRCLE_DURATION) *
        (1 - Easing.outQuint(exitTime / FOLLOW_CIRCLE_DURATION));
      this.followCircleSprite.scale.set(
        MathUtils.lerpClamped01(
          followCircleScaleFactor,
          FOLLOW_CIRCLE_SCALE_INITIAL,
          FOLLOW_CIRCLE_SCALE_FULL
        )
      );
    }

    if (finalSpan) {
      if (this.slider.spans % 2 == 0) {
        this.sliderPathSprite.startProp = 0;
        this.sliderPathSprite.endProp = sliderProportion;
      } else {
        this.sliderPathSprite.startProp = sliderProportion;
        this.sliderPathSprite.endProp = 1;
      }
    }
  }

  private createNestedObject(
    nestedHitObject: HitObject
  ): TimelineElement<DOTimelineInstance> | null {
    if (nestedHitObject instanceof SliderTick) {
      return this.createSliderTick(nestedHitObject);
    }

    if (nestedHitObject instanceof SliderRepeat) {
      return this.createSliderRepeat(nestedHitObject);
    }

    return null;
  }

  private createSliderTick(
    tick: SliderTick
  ): TimelineElement<SliderTickSprite> {
    const startTime = tick.startTime - tick.timePreempt;
    const endTime = tick.startTime;

    return {
      startTimeMs: startTime,
      endTimeMs: endTime + SliderTickSprite.EXIT_ANIMATION_DURATION,
      build: () => {
        const sprite = new SliderTickSprite(
          this.accentColor,
          startTime,
          endTime,
          tick.scale / 2
        );

        sprite.position.copyFrom(
          tick.startPosition.subtract(this.slider.startPosition)
        );

        return sprite;
      },
    };
  }

  private createSliderRepeat(
    repeat: SliderRepeat
  ): TimelineElement<SliderReverseArrowSprite> {
    return {
      startTimeMs: repeat.startTime - repeat.timePreempt,
      endTimeMs: repeat.startTime + 
        SliderReverseArrowSprite.EXIT_ANIMATION_DURATION,
      build: () => {
        const sprite = new SliderReverseArrowSprite(
          repeat, 
          this.controlPoints
        );

        const angle = sliderAngle(
          this.slider.path, 
          repeat.repeatIndex % 2 !== 0
        );

        sprite.position.copyFrom(
          repeat.startPosition.subtract(this.slider.startPosition)
        );

        sprite.angle = angle;

        return sprite;
      },
    };
  }
}
