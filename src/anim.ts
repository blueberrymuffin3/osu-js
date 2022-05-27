import bezier from "bezier-easing";

export const easeOut = bezier(0, 0, 0.58, 1);
export const lerp = (p: number, a: number, b: number) => {
  p = Math.max(0, Math.min(1, p));
  return a * (1 - p) + b * p;
};
