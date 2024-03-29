import { getScaledRect, POLICY } from "./adaptive-scale";
import { Origins, StoryboardAnimation } from "osu-classes";
import { DisplayObject, Graphics, IPointData, Rectangle } from "pixi.js";

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

export const VIRTUAL_SCREEN = new Rectangle(0, 0, 1920, 1080);
export const VIRTUAL_SCREEN_MASK = new Graphics();
VIRTUAL_SCREEN_MASK.beginFill();
VIRTUAL_SCREEN_MASK.drawRect(
  VIRTUAL_SCREEN.x,
  VIRTUAL_SCREEN.y,
  VIRTUAL_SCREEN.width,
  VIRTUAL_SCREEN.height
);
VIRTUAL_SCREEN_MASK.endFill();

export const OSU_PIXELS_SCREEN_WIDESCREEN_MASK = new Graphics();
OSU_PIXELS_SCREEN_WIDESCREEN_MASK.beginFill();
OSU_PIXELS_SCREEN_WIDESCREEN_MASK.drawRect(
  OSU_PIXELS_SCREEN_WIDESCREEN.x,
  OSU_PIXELS_SCREEN_WIDESCREEN.y,
  OSU_PIXELS_SCREEN_WIDESCREEN.width,
  OSU_PIXELS_SCREEN_WIDESCREEN.height
);
OSU_PIXELS_SCREEN_WIDESCREEN_MASK.endFill();

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

// Dimming each sprite individually allows for "overexposure" with additive blending
export const STORYBOARD_BRIGHTNESS = 0.2;

export const STORYBOARD_STANDARD_RECT = new Rectangle(
  0,
  0,
  OSU_PIXELS_SCREEN_SIZE.width,
  OSU_PIXELS_SCREEN_SIZE.height
);

export const STORYBOARD_STANDARD_MASK = new Graphics();

STORYBOARD_STANDARD_MASK.beginFill();
STORYBOARD_STANDARD_MASK.drawRect(
  STORYBOARD_STANDARD_RECT.x,
  STORYBOARD_STANDARD_RECT.y,
  STORYBOARD_STANDARD_RECT.width,
  STORYBOARD_STANDARD_RECT.height
);
STORYBOARD_STANDARD_MASK.endFill();

// prettier-ignore
export const STORYBOARD_ORIGIN_MAP = new Map<Origins, IPointData>([
  [Origins.Custom,       { x: 0  , y: 0   }],
  [Origins.TopLeft,      { x: 0  , y: 0   }],
  [Origins.CentreLeft,   { x: 0  , y: 0.5 }],
  [Origins.BottomLeft,   { x: 0  , y: 1   }],
  [Origins.TopCentre,    { x: 0.5, y: 0   }],
  [Origins.Centre,       { x: 0.5, y: 0.5 }],
  [Origins.BottomCentre, { x: 0.5, y: 1   }],
  [Origins.TopRight,     { x: 1  , y: 0   }],
  [Origins.CentreRight,  { x: 1  , y: 0.5 }],
  [Origins.BottomRight,  { x: 1  , y: 1   }],
]);

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

export const isUsingIOS = (function () {
  var iosQuirkPresent = function () {
      var audio = new Audio();

      audio.volume = 0.5;
      return audio.volume === 1;   // volume cannot be changed from "1" on iOS 12 and below
  };

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  var isAppleDevice = navigator.userAgent.includes('Macintosh');
  var isTouchScreen = navigator.maxTouchPoints >= 1;   // true for iOS 13 (and hopefully beyond)

  return isIOS || (isAppleDevice && (isTouchScreen || iosQuirkPresent()));
})();

export const isUsingFirefox = navigator.userAgent.includes("Firefox");
export const firefoxMaxTimeBetweenUpdates = 0.1; // Time should update about once every 40ms
