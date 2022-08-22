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

const SLIDER_BODY_SNAKING = true;
const SLIDER_BODY_FADE_OUT = 40;

const SLIDER_BALL_SCALE_INITIAL = 1;
const SLIDER_BALL_SCALE_EXIT = 1.2;
const SLIDER_BALL_FOLLOW_AREA = 2.4;
const SLIDER_BALL_ANIM_DURATION = 450;
const SLIDER_BALL_FADE_OUT = SLIDER_BALL_ANIM_DURATION / 4;

const FOLLOW_CIRCLE_SCALE_INITIAL = 1 / SLIDER_BALL_FOLLOW_AREA;
const FOLLOW_CIRCLE_SCALE_EXIT = 1;
const FOLLOW_CIRCLE_PRESS_ANIM_DURATION = 300;
const FOLLOW_CIRCLE_END_ANIM_DURATION = 300;
const FOLLOW_CIRCLE_FADE_IN = FOLLOW_CIRCLE_PRESS_ANIM_DURATION / 2;
const FOLLOW_CIRCLE_FADE_OUT = FOLLOW_CIRCLE_FADE_IN;

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
    FOLLOW_CIRCLE_END_ANIM_DURATION
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

    const totalProgress = MathUtils.clamp01(
      timeRelativeMs / this.slider.duration
    );

    const spanProgress = this.slider.path.progressAt(
      totalProgress,
      this.slider.spans
    );
    
    this.updateAlpha(enterTime, exitTime);
    this.updateProgress(totalProgress, spanProgress, enterTime);
    this.updateFollower(timeRelativeMs, spanProgress, exitTime);
  }

  private updateAlpha(enterTime: number, exitTime: number): void {
    const fadeInProgress = enterTime / this.fadeIn;
    const alphaFadeIn = MathUtils.lerpClamped01(fadeInProgress, 0, 1);

    const fadeOutProgress = exitTime / SLIDER_FADE_OUT;
    const alphaFadeOut = MathUtils.lerpClamped01(fadeOutProgress, 1, 0);

    this.alpha = alphaFadeIn * alphaFadeOut;
    
    const pathFadeOutProgress = MathUtils.clamp01(
      exitTime / SLIDER_BODY_FADE_OUT
    );

    this.sliderPathSprite.alpha = MathUtils.lerp(pathFadeOutProgress, 1, 0);
  }

  private updateProgress(
    totalProgress: number,
    spanProgress: number,
    enterTime: number
  ): void {
    // https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Osu/Skinning/Default/SnakingSliderBody.cs#L79

    let startProgress = 0;
    let endProgress = 1;

    if (totalProgress > 1 - 1 / this.slider.spans) { 
      if (this.slider.spans % 2 == 0) {
        endProgress = SLIDER_BODY_SNAKING ? spanProgress : 1;
      } else {
        startProgress = SLIDER_BODY_SNAKING ? spanProgress : 0;
      }
    } else if (SLIDER_BODY_SNAKING) {
      endProgress = MathUtils.clamp01(3 * enterTime / this.preempt);
    }

    this.sliderPathSprite.startProgress = startProgress;
    this.sliderPathSprite.endProgress = endProgress;
  }

  private updateFollower(
    timeRelativeMs: number, 
    spanProgress: number, 
    exitTime: number
  ): void {
    const isSliderActive = timeRelativeMs >= 0;

    this.follower.visible = isSliderActive;

    if (!isSliderActive) return;
    
    const currentPosition = this.slider.path.positionAt(spanProgress);

    this.follower.position.copyFrom(currentPosition);

    const ballFadeOutProgress = exitTime / SLIDER_BALL_FADE_OUT;
    const ballAnimProgress = exitTime / SLIDER_BALL_ANIM_DURATION;

    const sliderBallScaleFactor = Easing.outQuad(ballAnimProgress);
  
    this.sliderBallSprite.alpha = 1 - Easing.outQuad(ballFadeOutProgress);

    this.sliderBallSprite.scale.set(
      MathUtils.lerpClamped01(
        sliderBallScaleFactor,
        SLIDER_BALL_SCALE_INITIAL,
        SLIDER_BALL_SCALE_EXIT
      )
    );

    // TODO: Maybe these all variables should be renamed to something better?
    // https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Osu/Skinning/Default/DefaultFollowCircle.cs#L33
    const circlePressProgress = timeRelativeMs / FOLLOW_CIRCLE_PRESS_ANIM_DURATION;
    const circleEndProgress = exitTime / FOLLOW_CIRCLE_END_ANIM_DURATION;
    const circleFadeOutProgress = exitTime / FOLLOW_CIRCLE_FADE_OUT;

    const circleScaleIn = Easing.outQuint(circlePressProgress);
    const circleScaleOut = Easing.outQuint(circleEndProgress);
    const circleFadeOut = Easing.outQuint(circleFadeOutProgress);

    this.followCircleSprite.alpha = circleScaleIn * (1 - circleFadeOut);

    let followCircleScaleFactor = 1;
    
    if (this.followCircleSprite.alpha > FLOAT_EPSILON) {
      followCircleScaleFactor = circleScaleIn * (1 - circleScaleOut);
    }
  
    this.followCircleSprite.scale.set(
      MathUtils.lerpClamped01(
        followCircleScaleFactor,
        FOLLOW_CIRCLE_SCALE_INITIAL,
        FOLLOW_CIRCLE_SCALE_EXIT
      )
    );
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
