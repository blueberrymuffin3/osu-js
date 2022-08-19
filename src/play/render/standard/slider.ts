import { SliderPath, Vector2 } from "osu-classes";
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

  private hitObject: Slider;

  private sliderPathSprite: SliderPathSprite;
  private nestedDisplayObjectsTimeline: DisplayObjectTimeline;
  private follower: Container;
  private sliderBallSprite: Sprite;
  private followCircleSprite: Sprite;

  public constructor(
    hitObject: Slider,
    accentColor: number,
    trackColor: number,
    borderColor: number
  ) {
    super();

    this.hitObject = hitObject;
    this.preempt = hitObject.timePreempt;
    this.fadeIn = hitObject.timeFadeIn;

    this.sliderPathSprite = new SliderPathSprite(
      hitObject,
      trackColor,
      borderColor
    );

    this.sliderBallSprite = Sprite.from(TEXTURE_SLIDER_BALL);
    this.sliderBallSprite.blendMode = BLEND_MODES.ADD;
    this.sliderBallSprite.anchor.set(0.5);

    const nestedDisplayObjects: TimelineElement<DOTimelineInstance>[] = [];

    for (const nestedHitObject of hitObject.nestedHitObjects) {
      if (nestedHitObject instanceof SliderTick) {
        const startTime =
          nestedHitObject.startTime - nestedHitObject.timePreempt;
        const endTime = nestedHitObject.startTime;

        nestedDisplayObjects.push({
          startTimeMs: startTime,
          endTimeMs: endTime + SliderTickSprite.EXIT_ANIMATION_DURATION,
          build: () => {
            const sprite = new SliderTickSprite(
              accentColor,
              startTime,
              endTime,
              nestedHitObject.scale / 2
            );
            sprite.position.copyFrom(
              nestedHitObject.startPosition.subtract(hitObject.startPosition)
            );
            return sprite;
          },
        });
      } else if (nestedHitObject instanceof SliderRepeat) {
        const angle = sliderAngle(
          hitObject.path,
          nestedHitObject.repeatIndex % 2 !== 0
        );
        nestedDisplayObjects.push({
          startTimeMs: nestedHitObject.startTime - nestedHitObject.timePreempt,
          endTimeMs:
            nestedHitObject.startTime +
            SliderReverseArrowSprite.EXIT_ANIMATION_DURATION,
          build: () => {
            const sprite = new SliderReverseArrowSprite(nestedHitObject);
            sprite.position.copyFrom(
              nestedHitObject.startPosition.subtract(hitObject.startPosition)
            );
            sprite.angle = angle;
            return sprite;
          },
        });
      }
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
    this.follower.scale.set(this.hitObject.scale / 2);
    this.follower.addChild(this.sliderBallSprite, this.followCircleSprite);

    this.addChild(
      this.sliderPathSprite,
      this.nestedDisplayObjectsTimeline,
      this.follower
    );
  }

  update(timeMs: number) {
    this.nestedDisplayObjectsTimeline.update(timeMs);

    const timeRelativeMs = timeMs - this.hitObject.startTime;

    const enterTime = timeRelativeMs + this.preempt;
    const exitTime = timeRelativeMs - this.hitObject.duration;

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
      timeRelativeMs / this.hitObject.duration
    );
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
