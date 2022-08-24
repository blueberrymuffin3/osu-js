import { BeatmapColorSection, Color4, ControlPointInfo } from "osu-classes";
import { Circle, Slider, StandardBeatmap, StandardHitObject } from "osu-standard-stable";
import { OSU_DEFAULT_COMBO_COLORS, OSU_DEFAULT_SLIDER_BORDER_COLOR } from "../constants";
import { CirclePiece } from "../render/standard/circle";
import { SliderPiece } from "../render/standard/slider";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  TimelineElement,
} from "./timeline";

interface IBeatmapColors {
  combo: number[];
  sliderBorder: number;
  sliderTrack: number | null;
}

function getBeatmapColors(colors: BeatmapColorSection): IBeatmapColors {
  const colorToNum = (c: Color4) => (c.red << 16) | (c.green << 8) | c.blue;
  
  const combo = colors.comboColors.length > 0 
    ? colors.comboColors.map(colorToNum) 
    : OSU_DEFAULT_COMBO_COLORS;

  const sliderBorder = colors.sliderBorderColor
    ? colorToNum(colors.sliderBorderColor)
    : OSU_DEFAULT_SLIDER_BORDER_COLOR;

  const sliderTrack = colors.sliderTrackColor
    ? colorToNum(colors.sliderTrackColor)
    : null;

  return { combo, sliderBorder, sliderTrack };
}

function generateTimelineElement(
  hitObject: StandardHitObject,
  controlPoints: ControlPointInfo,
  colors: IBeatmapColors,
): TimelineElement<DOTimelineInstance>[] {
  // Use combo index with offset to get combo color after all combo skips. 
  const accentColor = colors.combo[hitObject.comboIndexWithOffsets % colors.combo.length];
  
  // Slider track color uses combo color by default.
  const trackColor = colors.sliderTrack ?? accentColor;
  const borderColor = colors.sliderBorder;

  const circlePiece = {
    startTimeMs: hitObject.startTime - hitObject.timePreempt,
    endTimeMs: hitObject.startTime + CirclePiece.EXIT_ANIMATION_DURATION,
    build() {
      const object = new CirclePiece(hitObject, accentColor);
      object.x = hitObject.stackedStartPosition.x;
      object.y = hitObject.stackedStartPosition.y;

      return object;
    },
  };

  if (hitObject instanceof Circle) {
    return [circlePiece];
  } 
  
  if (hitObject instanceof Slider) {
    return [
      circlePiece,
      {
        startTimeMs: hitObject.startTime - hitObject.timePreempt,
        endTimeMs: hitObject.endTime + SliderPiece.EXIT_ANIMATION_DURATION,
        build() {
          const object = new SliderPiece(
            hitObject,
            controlPoints, 
            accentColor, 
            trackColor, 
            borderColor
          );

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
  public constructor(beatmap: StandardBeatmap) {
    const { colors, hitObjects, controlPoints } = beatmap;
    
    const beatmapColors = getBeatmapColors(colors);

    const timelineElements = hitObjects.flatMap((hitObject) => {
      return generateTimelineElement(hitObject, controlPoints, beatmapColors);
    });

    super(timelineElements);
  }
}
