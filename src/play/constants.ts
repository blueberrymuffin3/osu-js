import { getScaledRect, POLICY } from "./adaptive-scale";
import { BeatmapDifficultySection, StoryboardAnimation } from "osu-classes";
import { DisplayObject, Rectangle } from "pixi.js";

export type TimeMsProvider = () => number;

export interface Size {
  width: number;
  height: number;
}

export const TEXTURE_PIXELS_SCREEN_SIZE: Size = {
  width: 1366,
  height: 768,
};

export const OSU_PIXELS_SCREEN_SIZE: Size = {
  width: 640,
  height: 480,
};

const osuPixelsScreenWidescreenWidth = OSU_PIXELS_SCREEN_SIZE.height * (16 / 9);
export const OSU_PIXELS_SCREEN_WIDESCREEN: Rectangle = new Rectangle(
  -(osuPixelsScreenWidescreenWidth - OSU_PIXELS_SCREEN_SIZE.width) * 0.5,
  0,
  osuPixelsScreenWidescreenWidth,
  OSU_PIXELS_SCREEN_SIZE.height
);

export const OSU_PIXELS_PLAY_AREA_SIZE: Size = {
  width: 510,
  height: 385,
};

// Formula from https://github.com/Damnae/storybrew/blob/0cf685a24ca53860d809cb7202aab134599d5b15/common/Mapset/OsuHitObject.cs#L14
export const OSU_PIXELS_PLAY_AREA_OFFSET = {
  x: (OSU_PIXELS_SCREEN_SIZE.width - OSU_PIXELS_PLAY_AREA_SIZE.width) * 0.5,
  y:
    (OSU_PIXELS_SCREEN_SIZE.height - OSU_PIXELS_PLAY_AREA_SIZE.height) * 0.75 -
    16,
};

export const OSU_HIT_OBJECT_RADIUS = 64;

export const OSU_DEFAULT_COMBO_COLORS = [
  0xffc000, 0x00ca00, 0x127cff, 0xf21839,
];

export const OSU_DEFAULT_SLIDER_BORDER_COLOR = 0xffffff;

export const diameterFromCs = (CS: number) => 54.4 - 4.48 * CS;

export const preemtTimeFromAr = (AR: number) =>
  BeatmapDifficultySection.range(AR, 1800, 1200, 450);
export const fadeInTimeFromAr = (AR: number) =>
  BeatmapDifficultySection.range(AR, 1200, 800, 300);

export function adaptiveScaleDisplayObject(
  containerSize: Size,
  targetSize: Size,
  object: DisplayObject,
  policy = POLICY.ShowAll
) {
  const scaled = getScaledRect({
    container: containerSize,
    target: targetSize,
    policy,
  });
  object.scale.set(
    scaled.width / targetSize.width,
    scaled.height / targetSize.height
  );
  object.x = scaled.x;
  object.y = scaled.y;
}

export const getAllFramePaths = (element: StoryboardAnimation) => {
  const extensionDotIndex = element.filePath.lastIndexOf(".");
  const prefix = element.filePath.substring(0, extensionDotIndex);
  const suffix = element.filePath.substring(extensionDotIndex);
  const paths = [];
  for (let i = 0; i < element.frameCount; i++) {
    paths.push(prefix + i + suffix);
  }
  return paths;
};
