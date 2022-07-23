import { EasingFunction } from "bezier-easing";
import { Easing, Vector2 } from "osu-classes";
import { Color } from "osu-storyboard-parser";

export const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

export const lerp = (p: number, a: number, b: number) => lerpUnclamped(clamp01(p), a, b);
export const lerpUnclamped = (p: number, a: number, b: number) => a * (1 - p) + b * p;
export const lerp2D = (p: number, a: Vector2, b: Vector2) => new Vector2(lerp(p, a.x, b.x), lerp(p, a.y, b.y));
export const lerpRGB = (p: number, a: Color, b: Color): Color => ({r: lerp(p, a.r, b.r), g: lerp(p, a.g, b.g), b: lerp(p, a.b, b.b)});

export const clampEase =
  (fn: EasingFunction): EasingFunction =>
  (p: number) =>
    fn(clamp01(p));

export namespace EasingFunctions {
  // Formulas from https://github.com/ppy/osu-framework/blob/master/osu.Framework/Graphics/Transforms/DefaultEasingFunction.cs
  const elastic_const = (2 * Math.PI) / 0.3;
  const elastic_const2 = 0.3 / 4;

  const back_const = 1.70158;
  const back_const2 = back_const * 1.525;

  const bounce_const = 1 / 2.75;

  // constants used to fix expo and elastic curves to start/end at 0/1
  const expo_offset = Math.pow(2, -10);
  const elastic_offset_full = Math.pow(2, -11);
  const elastic_offset_half = Math.pow(2, -10) * Math.sin((0.5 - elastic_const2) * elastic_const);
  const elastic_offset_quarter = Math.pow(2, -10) * Math.sin((0.25 - elastic_const2) * elastic_const);
  const in_out_elastic_offset = Math.pow(2, -10) * Math.sin(((1 - elastic_const2 * 1.5) * elastic_const) / 1.5);

  export const None = clampEase((p) => p);
  export const InQuad = clampEase((p) => p * p);
  export const OutQuad = clampEase((p) => p * (2 - p));
  export const InOutQuad = clampEase((p) => {
    if (p < 0.5) return p * p * 2;
    return --p * p * -2 + 1;
  });
  export const InCubic = clampEase((p) => p * p * p);
  export const OutCubic = clampEase((p) => --p * p * p + 1);
  export const InOutCubic = clampEase((p) => {
    if (p < 0.5) return p * p * p * 4;
    return --p * p * p * 4 + 1;
  });
  export const InQuart = clampEase((p) => p * p * p * p);
  export const OutQuart = clampEase((p) => 1 - --p * p * p * p);
  export const InOutQuart = clampEase((p) => {
    if (p < 0.5) return p * p * p * p * 8;
    return --p * p * p * p * -8 + 1;
  });
  export const InQuint = clampEase((p) => p * p * p * p * p);
  export const OutQuint = clampEase((p) => --p * p * p * p * p + 1);
  export const InOutQuint = clampEase((p) => {
    if (p < 0.5) return p * p * p * p * p * 16;
    return --p * p * p * p * p * 16 + 1;
  });
  export const InSine = clampEase((p) => 1 - Math.cos(p * Math.PI * 0.5));
  export const OutSine = clampEase((p) => Math.sin(p * Math.PI * 0.5));
  export const InOutSine = clampEase((p) => 0.5 - 0.5 * Math.cos(Math.PI * p));
  export const InExpo = clampEase((p) => Math.pow(2, 10 * (p - 1)) + expo_offset * (p - 1));
  export const OutExpo = clampEase((p) => -Math.pow(2, -10 * p) + 1 + expo_offset * p);
  export const InOutExpo = clampEase((p) => {
    if (p < 0.5) return 0.5 * (Math.pow(2, 20 * p - 10) + expo_offset * (2 * p - 1));
    return 1 - 0.5 * (Math.pow(2, -20 * p + 10) + expo_offset * (-2 * p + 1));
  });
  export const InCirc = clampEase((p) => 1 - Math.sqrt(1 - p * p));
  export const OutCirc = clampEase((p) => Math.sqrt(1 - --p * p));
  export const InOutCirc = clampEase((p) => {
    if ((p *= 2) < 1) return 0.5 - 0.5 * Math.sqrt(1 - p * p);
    return 0.5 * Math.sqrt(1 - (p -= 2) * p) + 0.5;
  });
  export const InElastic = clampEase((p) => -Math.pow(2, -10 + 10 * p) * Math.sin((1 - elastic_const2 - p) * elastic_const) + elastic_offset_full * (1 - p));
  export const OutElastic = clampEase((p) => Math.pow(2, -10 * p) * Math.sin((p - elastic_const2) * elastic_const) + 1 - elastic_offset_full * p);
  export const OutElasticHalf = clampEase((p) => Math.pow(2, -10 * p) * Math.sin((0.5 * p - elastic_const2) * elastic_const) + 1 - elastic_offset_half * p);
  export const OutElasticQuarter = clampEase((p) => Math.pow(2, -10 * p) * Math.sin((0.25 * p - elastic_const2) * elastic_const) + 1 - elastic_offset_quarter * p);
  export const InOutElastic = clampEase((p) => {
    if ((p *= 2) < 1) return -0.5 * (Math.pow(2, -10 + 10 * p) * Math.sin(((1 - elastic_const2 * 1.5 - p) * elastic_const) / 1.5) - in_out_elastic_offset * (1 - p));
    return 0.5 * (Math.pow(2, -10 * --p) * Math.sin(((p - elastic_const2 * 1.5) * elastic_const) / 1.5) - in_out_elastic_offset * p) + 1;
  });
  export const InBack = clampEase((p) => p * p * ((back_const + 1) * p - back_const));
  export const OutBack = clampEase((p) => --p * p * ((back_const + 1) * p + back_const) + 1);
  export const InOutBack = clampEase((p) => {
    if ((p *= 2) < 1) return 0.5 * p * p * ((back_const2 + 1) * p - back_const2);
    return 0.5 * ((p -= 2) * p * ((back_const2 + 1) * p + back_const2) + 2);
  });
  export const InBounce = clampEase((p) => {
    p = 1 - p;
    if (p < bounce_const) return 1 - 7.5625 * p * p;
    if (p < 2 * bounce_const) return 1 - (7.5625 * (p -= 1.5 * bounce_const) * p + 0.75);
    if (p < 2.5 * bounce_const) return 1 - (7.5625 * (p -= 2.25 * bounce_const) * p + 0.9375);
    return 1 - (7.5625 * (p -= 2.625 * bounce_const) * p + 0.984375);
  });
  export const OutBounce = clampEase((p) => {
    if (p < bounce_const) return 7.5625 * p * p;
    if (p < 2 * bounce_const) return 7.5625 * (p -= 1.5 * bounce_const) * p + 0.75;
    if (p < 2.5 * bounce_const) return 7.5625 * (p -= 2.25 * bounce_const) * p + 0.9375;
    return 7.5625 * (p -= 2.625 * bounce_const) * p + 0.984375;
  });
  export const InOutBounce = clampEase((p) => {
    if (p < 0.5) return 0.5 - 0.5 * OutBounce(1 - p * 2);
    return OutBounce((p - 0.5) * 2) * 0.5 + 0.5;
  });

  //prettier-ignore
  export function getEasingFn(easing: Easing): EasingFunction{
    switch (easing)
    {
      case Easing.None:
      default:
        return None;
      
      case Easing.In:
      case Easing.InQuad:
        return InQuad;

      case Easing.Out:
      case Easing.OutQuad:
        return OutQuad;

      case Easing.InOutQuad:
        return InOutQuad;

      case Easing.InCubic:
        return InCubic;

      case Easing.OutCubic:
        return OutCubic;

      case Easing.InOutCubic:
        return InOutCubic;

      case Easing.InQuart:
        return InQuart;

      case Easing.OutQuart:
        return OutQuart;

      case Easing.InOutQuart:
        return InOutQuart;  

      case Easing.InQuint:
        return InQuint;

      case Easing.OutQuint:
        return OutQuint;

      case Easing.InOutQuint:
        return InOutQuint;

      case Easing.InSine:
        return InSine;

      case Easing.OutSine:
        return OutSine;

      case Easing.InOutSine:
        return InOutSine;

      case Easing.InExpo:
        return InExpo;

      case Easing.OutExpo:
        return OutExpo;

      case Easing.InOutExpo:
        return InOutExpo;

      case Easing.InCirc:
        return InCirc;

      case Easing.OutCirc:
        return OutCirc;

      case Easing.InOutCirc:
        return InOutCirc;

      case Easing.InElastic:
        return InElastic;

      case Easing.OutElastic:
        return OutElastic;

      case Easing.OutElasticHalf:
        return OutElasticHalf;

      case Easing.OutElasticQuarter:
        return OutElasticQuarter;

      case Easing.InOutElastic:
        return InOutElastic;

      case Easing.InBack:
        return InBack;

      case Easing.OutBack:
        return OutBack;

      case Easing.InOutBack:
        return InOutBack;

      case Easing.InBounce:
        return InBounce;

      case Easing.OutBounce:
        return OutBounce;

      case Easing.InOutBounce:
        return InOutBounce;
    }
  }
}
