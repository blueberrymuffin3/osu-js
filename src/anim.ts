import { EasingFunction } from "bezier-easing";

export const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

export const lerp = (p: number, a: number, b: number) =>
  lerpUnclamped(clamp01(p), a, b);
export const lerpUnclamped = (p: number, a: number, b: number) =>
  a * (1 - p) + b * p;

export const clampEase =
  (fn: EasingFunction): EasingFunction =>
  (p: number) =>
    fn(clamp01(p));

// Formulas borrowed from https://github.com/ppy/osu-framework/blob/master/osu.Framework/Graphics/Transforms/DefaultEasingFunction.cs
const elastic_const = (2 * Math.PI) / 0.3;
const elastic_const2 = 0.3 / 4;
const elastic_offset_half =
  Math.pow(2, -10) * Math.sin((0.5 - elastic_const2) * elastic_const);

export const outQuad = clampEase((p) => p * (2 - p));
export const outElasticHalf = clampEase(
  (p) =>
    Math.pow(2, -10 * p) *
      Math.sin((0.5 * p - elastic_const2) * elastic_const) +
    1 -
    elastic_offset_half * p
);
