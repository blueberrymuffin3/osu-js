import { Circle, Slider, StandardHitObject } from "osu-standard-stable";
import { OSU_DEFAULT_COMBO_COLORS } from "../constants";
import { CirclePiece } from "../render/circle";
import { SliderPiece } from "../render/slider";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  TimelineElement,
} from "./timeline";

// TODO: Remove difficulty reference
function generateTimelineElement(
  hitObject: StandardHitObject
): TimelineElement<DOTimelineInstance>[] {
  // TODO: calculate color elsewhere
  const color =
    OSU_DEFAULT_COMBO_COLORS[
      hitObject.comboIndex % OSU_DEFAULT_COMBO_COLORS.length
    ];

  const circlePiece = {
    startTimeMs: hitObject.startTime - hitObject.timePreempt,
    endTimeMs: hitObject.startTime + CirclePiece.EXIT_ANIMATION_DURATION,
    build() {
      const object = new CirclePiece(color, hitObject);
      object.x = hitObject.stackedStartPosition.x;
      object.y = hitObject.stackedStartPosition.y;

      return object;
    },
  };

  if (hitObject instanceof Circle) {
    return [circlePiece];
  } else if (hitObject instanceof Slider) {
    return [
      circlePiece,
      {
        startTimeMs: hitObject.startTime - hitObject.timePreempt,
        endTimeMs: hitObject.endTime,
        build() {
          const object = new SliderPiece(color, hitObject);
          object.x = hitObject.stackedStartPosition.x;
          object.y = hitObject.stackedStartPosition.y;

          return object;
        },
      },
    ];
  }

  console.warn("Unknown hitObject type", hitObject.hitType);
  return [];
}

export class HitObjectTimeline extends DisplayObjectTimeline {
  public constructor(hitObjects: StandardHitObject[]) {
    super(hitObjects.flatMap(generateTimelineElement));
  }
}
