import { BeatmapDifficultySection } from "osu-classes";
import { Circle, Slider, StandardHitObject } from "osu-standard-stable";
import { Application } from "pixi.js";
import { OSU_DEFAULT_COMBO_COLORS } from "../constants";
import { CirclePiece } from "../render/circle";
import { SliderPiece } from "../render/slider";
import { Timeline, TimelineElement } from "./timeline";

// TODO: Remove application reference
// TODO: Remove difficulty reference
function generateTimelineElement(
  app: Application,
  difficulty: BeatmapDifficultySection,
  hitObject: StandardHitObject
): TimelineElement[] {
  // TODO: calculate color elsewhere
  const color =
    OSU_DEFAULT_COMBO_COLORS[
      hitObject.comboIndex % OSU_DEFAULT_COMBO_COLORS.length
    ];

  const circlePiece = {
    startTimeMs: hitObject.startTime - hitObject.timePreempt,
    endTimeMs: hitObject.startTime + 5000, // TODO: Calculate this properly
    build() {
      const object = new CirclePiece(app, color, hitObject);
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
          const object = new SliderPiece(app, color, hitObject, difficulty);
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

export class HitObjectTimeline extends Timeline {
  public constructor(
    app: Application,
    difficulty: BeatmapDifficultySection,
    hitObjects: StandardHitObject[]
  ) {
    super(
      hitObjects.flatMap(generateTimelineElement.bind(null, app, difficulty))
    );
  }
}
