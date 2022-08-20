import { MathUtils, Easing } from "osu-classes";
import { ControlPointInfo, TimingPoint } from "osu-classes";
import { SliderRepeat } from "osu-standard-stable";
import { BLEND_MODES, Sprite, Texture } from "pixi.js";
import { IUpdatable } from "../../../game/timeline";
import { TEXTURE_SLIDER_REVERSE_ARROW } from "../../../resources/textures";

const SCALE_IN = 0.5;
const SCALE_OUT = 1.5;
const SCALE_FACTOR = 0.6;
const PULSE_SCALE = 1.3;
const PULSE_THRESHOLD = 16;

const MAX_ANIM_DURATION = 300;
const MINIMUM_BEAT_LENGTH = 200;
const BEAT_DIVISOR = 2;

export class SliderReverseArrowSprite extends Sprite implements IUpdatable {
  public static EXIT_ANIMATION_DURATION = MAX_ANIM_DURATION;

  declare private timingPoint: TimingPoint;
  private controlPoints: ControlPointInfo;
  private timeEnter: number;
  private timeHit: number;
  private animDuration: number;
  private baseScale: number;

  constructor(hitObject: SliderRepeat, controlPoints: ControlPointInfo) {
    super(Texture.from(TEXTURE_SLIDER_REVERSE_ARROW));

    this.anchor.set(0.5);
    this.blendMode = BLEND_MODES.ADD;

    this.controlPoints = controlPoints;
    this.timeEnter = hitObject.startTime - hitObject.timePreempt;
    this.timeHit = hitObject.startTime;
    this.animDuration = Math.min(MAX_ANIM_DURATION, hitObject.spanDuration);
    this.baseScale = hitObject.scale * SCALE_FACTOR;
  }

  update(timeMs: number): void {
    const timeSinceEnter = timeMs - this.timeEnter;
    const timeSinceHit = timeMs - this.timeHit;
    const timeSinceLastBeat = this.getTimeSinceLastBeat(timeMs);

    this.updateAlpha(timeSinceEnter, timeSinceHit);
    this.updateScale(timeSinceEnter, timeSinceHit, timeSinceLastBeat);
  }

  updateAlpha(timeFromEnter: number, timeFromHit: number): void {
    const alphaFadeIn = MathUtils.lerpClamped01(
      timeFromEnter / this.animDuration, 
      0, 
      1
    );
      
    const alphaFadeOut = MathUtils.lerpClamped01(
      Easing.outQuad(timeFromHit / this.animDuration), 
      1, 
      0
    );

    this.alpha = alphaFadeIn * alphaFadeOut;
  }

  private updateScale(
    timeSinceEnter: number, 
    timeSinceHit: number, 
    timeSinceLastBeat: number
  ): void {
    const scaleInFactor = MathUtils.lerpClamped01(
      Easing.outElasticHalf(timeSinceEnter / (this.animDuration * 2)),
      SCALE_IN,
      1
    );
    
    const scaleOutFactor = MathUtils.lerpClamped01(
      Easing.outQuad(timeSinceHit / this.animDuration), 
      1, 
      SCALE_OUT
    );

    // Add a threshold value to prevent pulsations right before the slider repeat is hit.
    const pulseStartTime = timeSinceHit + PULSE_THRESHOLD;
    const pulseInitialScale = pulseStartTime < 0 ? PULSE_SCALE : 1;

    const pulseFactor = MathUtils.lerpClamped01(
      Easing.outQuad(timeSinceLastBeat / this.timingPoint.beatLength),
      pulseInitialScale,
      1
    );

    this.scale.set(scaleInFactor * scaleOutFactor * pulseFactor * this.baseScale);
  }

  private getTimeSinceLastBeat(timeMs: number): number {
    this.timingPoint = this.controlPoints.timingPointAt(timeMs);

    let beatLength = this.timingPoint.beatLength / BEAT_DIVISOR;

    while (beatLength < MINIMUM_BEAT_LENGTH) {
      beatLength <<= 1;
    }

    let timeUntilNextBeat = (this.timingPoint.startTime - timeMs) % beatLength;
    
    if (timeUntilNextBeat <= 0) {
      timeUntilNextBeat += beatLength;
    }

    return beatLength - timeUntilNextBeat;
  }
}
