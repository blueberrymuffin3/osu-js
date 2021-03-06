import { getScaledRect, POLICY } from "./adaptive-scale";
import { BeatmapDifficultySection, Vector2 } from "osu-classes";
import type { DisplayObject } from "pixi.js";
import { AnimationObject } from "osu-storyboard-parser";

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

export const OSU_PIXELS_PLAY_AREA_SIZE: Size = {
  width: 512,
  height: 384,
};

export const OSU_PIXELS_PLAY_AREA_OFFSET = {
  x: (OSU_PIXELS_SCREEN_SIZE.width - OSU_PIXELS_PLAY_AREA_SIZE.width) / 2,
  y: (OSU_PIXELS_SCREEN_SIZE.height - OSU_PIXELS_PLAY_AREA_SIZE.height) / 2,
};

export const OSU_HIT_OBJECT_RADIUS = 64;

export const OSU_DEFAULT_COMBO_COLORS = [
  0xffc000, 0x00ca00, 0x127cff, 0xf21839,
];

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

export function minMax(points: Vector2[]): [Vector2, Vector2] {
  return [
    points.reduce(
      (a, b) => new Vector2(Math.min(a.x, b.x), Math.min(a.y, b.y))
    ),
    points.reduce(
      (a, b) => new Vector2(Math.max(a.x, b.x), Math.max(a.y, b.y))
    ),
  ];
}

export const getAllFramePaths = (element: AnimationObject) => {
  const extensionDotIndex = element.filepath.lastIndexOf(".");
  const prefix = element.filepath.substring(0, extensionDotIndex);
  const suffix = element.filepath.substring(extensionDotIndex);
  const paths = [];
  for (let i = 0; i < element.frameCount; i++) {
    paths.push(prefix + i + suffix);
  }
  return paths;
};
