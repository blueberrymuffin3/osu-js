/**
 * Notes from osu!wiki
 *
 * Storyboard scripting/General rules for storyboarding:
 *  By default, the preview background (the background you see in Song Select) specified for the map is placed below all other layers. However, if you reference that same file as an object in your storyboard, it will disappear immediately after the map loads.
 * Commands from the .osb file take precedence over those from the .osu file within the layers, as if the commands from the .osb were appended to the end of the .osu commands. This does not overrule the four layers mentioned above. Example: https://osu.ppy.sh/community/forums/topics/1869?n=103.
 */

import { Origins, ParameterType, Vector2 } from "osu-classes";
import {
  AnimationObject,
  Command,
  SpriteObject,
  StoryboardObject,
} from "osu-storyboard-parser";
import {
  BLEND_MODES,
  Container,
  Graphics,
  IPointData,
  Rectangle,
  Sprite,
  Texture,
  utils,
} from "pixi.js";
import { POLICY } from "../adaptive-scale";
import { EasingFunctions, lerp, lerpRGB } from "../anim";
import { LoadedBeatmap } from "../api/beatmap-loader";
import {
  adaptiveScaleDisplayObject,
  getAllFramePaths,
  OSU_PIXELS_SCREEN_SIZE,
} from "../constants";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  IUpdatable,
  Timeline,
  TimelineElement,
} from "./timeline";

// TODO: What is the overlay layer? Does anyone use it?

const VISIBLE_LAYERS = ["Background", "Pass", "Foreground", "Overlay"] as const;

// Dimming each sprite individually allows for "overexposure" with additive blending
const STORYBOARD_BRIGHTNESS = 0.2;

const STORYBOARD_STANDARD_RECT = new Rectangle(
  0,
  0,
  OSU_PIXELS_SCREEN_SIZE.width,
  OSU_PIXELS_SCREEN_SIZE.height
);

const STORYBOARD_STANDARD_MASK = new Graphics();
STORYBOARD_STANDARD_MASK.beginFill();
STORYBOARD_STANDARD_MASK.drawRect(
  STORYBOARD_STANDARD_RECT.x,
  STORYBOARD_STANDARD_RECT.y,
  STORYBOARD_STANDARD_RECT.width,
  STORYBOARD_STANDARD_RECT.height
);
STORYBOARD_STANDARD_MASK.endFill();

// prettier-ignore
const ORIGIN_MAP = new Map<Origins, IPointData>([
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

export class StoryboardLayerTimeline extends Container {
  private backgroundSprite: Sprite | null = null;
  private timeline: DisplayObjectTimeline;
  private storyboardResources: Map<string, Texture>;

  public constructor(
    {
      storyboardResources,
      storyboard,
      background,
      data: beatmap,
    }: LoadedBeatmap,
    layer: typeof VISIBLE_LAYERS[number]
  ) {
    super();
    this.storyboardResources = storyboardResources;

    if (
      layer === "Background" &&
      background &&
      beatmap.events.background &&
      !storyboardResources.has(beatmap.events.background)
    ) {
      // Background not referenced in storyboard, so it should always be rendered behind everything else
      this.backgroundSprite = new Sprite(background);
      adaptiveScaleDisplayObject(
        STORYBOARD_STANDARD_RECT,
        background,
        this.backgroundSprite,
        POLICY.FullHeight
      );

      this.backgroundSprite.tint = utils.rgb2hex([
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
      ]);

      this.addChild(this.backgroundSprite);
    }

    if (!beatmap.general.widescreenStoryboard) {
      STORYBOARD_STANDARD_MASK.setParent(this);
      this.mask = STORYBOARD_STANDARD_MASK;
    }

    const elements = storyboard[layer]
      .map(this.createElement)
      .filter((e) => e != null) as TimelineElement<DOTimelineInstance>[];

    this.timeline = new DisplayObjectTimeline(elements);

    this.addChild(this.timeline);
  }

  private childOrderDirty = false;

  private createElement = (
    object: StoryboardObject,
    index: number
  ): TimelineElement<DOTimelineInstance> | null => {
    if (object.commands.length === 0) {
      console.warn("Object has no commands", object);

      return null;
    }

    let startTimeMs = object.commands
      .map((command) => command.startTime)
      .reduce((a, b) => Math.min(a, b)); // TODO: Calculate from first frame w/ nonzero alpha and scale

    const endTimeMs = object.commands
      .map((command) => command.endTime)
      .reduce((a, b) => Math.max(a, b));

    if (object.type === "Animation") {
      return {
        startTimeMs,
        endTimeMs,
        build: () => {
          this.childOrderDirty = true;

          const animation = new StoryboardAnimationRenderer(
            this.storyboardResources,
            object
          );
          animation.zIndex = index;
          return animation;
        },
      };
    } else if (object.type === "Sprite") {
      return {
        startTimeMs,
        endTimeMs,
        build: () => {
          this.childOrderDirty = true;

          const sprite = new StoryboardSpriteRenderer(
            this.storyboardResources,
            object
          );
          sprite.zIndex = index;
          return sprite;
        },
      };
    } else {
      console.warn("Unknown storyboard element", object);

      return null;
    }
  };

  public update(timeMs: number) {
    this.childOrderDirty = false;
    this.timeline.update(timeMs);
    if (this.childOrderDirty) {
      this.timeline.sortChildren();
    }
  }
}

const BACKTRACK_DEFAULT_VALUE_CLASSES = [
  ["S", "V"],
  ["C"],
  ["R"],
  ["C"],
  ["P"],
  ["F"],
] as const;

abstract class StoryboardRendererBase<T extends StoryboardObject>
  extends Sprite
  implements IUpdatable
{
  private commandTimeline: Timeline<Command>;
  private scalePositive = new Vector2(1, 1);
  private isParameterActive: { [key in ParameterType]: boolean } = {
    "": false,
    H: false,
    A: false,
    V: false,
  };

  protected object: T;

  constructor(object: T) {
    super();
    this.object = object;
    this.position.copyFrom(object.defaultPos);
    this.anchor.copyFrom(ORIGIN_MAP.get(object.origin)!);
    // TODO: Triggers
    this.commandTimeline = new Timeline(
      object.commands.map(this.createElement),
      () => {},
      this.updateCommand,
      this.finalizeCommand,
      false
    );
    this.tint = utils.rgb2hex([
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
    ]);

    const commandsDefault = object.commands
      .slice()
      .sort((a, b) => a.startTime - b.startTime);

    // Setup default values
    for (const classTypes of BACKTRACK_DEFAULT_VALUE_CLASSES) {
      for (const command of commandsDefault) {
        // TODO: WTF Typescript???
        if (classTypes.includes(command.type as never)) {
          this.updateCommand(command, 0);
          break;
        }
      }
    }

    // Setup default position
    let xPosSet = false;
    let yPosSet = false;
    for (const command of commandsDefault) {
      if (command.type === "M") {
        if (!xPosSet) {
          this.x = command.startValue.x;
        }
        if (!yPosSet) {
          this.y = command.startValue.y;
        }
        break;
      } else if (command.type === "MX") {
        if (!xPosSet) {
          this.x = command.startValue;
          xPosSet = true;
        }
      } else if (command.type === "MY") {
        if (!yPosSet) {
          this.y = command.startValue;
          yPosSet = true;
        }
      }

      if (xPosSet && yPosSet) {
        break;
      }
    }
  }

  private createElement = (command: Command): TimelineElement<Command> => ({
    startTimeMs: command.startTime,
    endTimeMs: command.endTime,
    build: () => command,
  });

  private updateCommand = (command: Command, timeMs: number) => {
    if (command.endTime > command.startTime) {
      const p =
        (timeMs - command.startTime) / (command.endTime - command.startTime);
      this.applyCommand(
        command,
        EasingFunctions.getEasingFn(command.easing)(p)
      );
    } else {
      this.applyCommand(command, timeMs >= command.startTime ? 1 : 0);
    }
  };

  private finalizeCommand = (command: Command) => {
    this.applyCommand(command, 1);
  };

  private applyCommand(command: Command, p: number) {
    if (command.type === "P") {
      // BlendingCommand, HorizontalFlipCommand, and VerticalFlipCommand
      // Active for the duration of the command
      (this.isParameterActive as any)[command.endValue as any] = p < 1;
    } else if (command.type === "C") {
      const { r, g, b } = lerpRGB(p, command.startValue, command.endValue);
      this.tint = utils.rgb2hex([
        (r / 255) * STORYBOARD_BRIGHTNESS,
        (g / 255) * STORYBOARD_BRIGHTNESS,
        (b / 255) * STORYBOARD_BRIGHTNESS,
      ]);
    } else if (command.type === "F") {
      this.alpha = lerp(p, command.startValue, command.endValue);
    } else if (command.type === "M") {
      this.x = lerp(p, command.startValue.x, command.endValue.x);
      this.y = lerp(p, command.startValue.y, command.endValue.y);
    } else if (command.type === "MX") {
      this.x = lerp(p, command.startValue, command.endValue);
    } else if (command.type === "MY") {
      this.y = lerp(p, command.startValue, command.endValue);
    } else if (command.type === "R") {
      this.rotation = lerp(p, command.startValue, command.endValue);
    } else if (command.type === "S") {
      const scale = lerp(p, command.startValue, command.endValue);
      this.scalePositive = new Vector2(scale, scale);
    } else if (command.type === "V") {
      const scaleX = lerp(p, command.startValue.x, command.endValue.x);
      const scaleY = lerp(p, command.startValue.y, command.endValue.y);
      this.scalePositive = new Vector2(scaleX, scaleY);
    } else {
      console.warn("Unknown command", command);
    }
  }

  update(timeMs: number): void {
    this.commandTimeline.update(timeMs);

    // Apply parameters
    this.scale.x = this.isParameterActive.H
      ? -this.scalePositive.x
      : this.scalePositive.x;
    this.scale.y = this.isParameterActive.V
      ? -this.scalePositive.y
      : this.scalePositive.y;
    this.blendMode = this.isParameterActive.A
      ? BLEND_MODES.ADD
      : BLEND_MODES.NORMAL;
  }
}

class StoryboardSpriteRenderer extends StoryboardRendererBase<SpriteObject> {
  public constructor(
    storyboardResources: Map<string, Texture>,
    object: SpriteObject
  ) {
    super(object);
    this.texture = storyboardResources.get(object.filepath) ?? Texture.EMPTY;
    if (this.texture == Texture.EMPTY) {
      console.warn("Sprite has no texture");
    }
  }
}

class StoryboardAnimationRenderer extends StoryboardRendererBase<AnimationObject> {
  private frames: Texture[];

  public constructor(
    storyboardResources: Map<string, Texture>,
    object: AnimationObject
  ) {
    super(object);
    this.frames = getAllFramePaths(object).map(
      (path) => storyboardResources.get(path) ?? Texture.EMPTY
    );
    if (this.frames.findIndex((x) => x == Texture.EMPTY) >= 0) {
      console.warn("Animation missing frames");
    }
    this.texture = this.frames[0];
  }

  update(timeMs: number): void {
    super.update(timeMs);

    // TODO: When does this start?
    let frameNumber = Math.floor((timeMs - 0) / this.object.frameDelay);
    if (this.object.loops) {
      frameNumber = frameNumber % this.frames.length;
    } else {
      frameNumber = Math.min(frameNumber, this.frames.length - 1);
    }
    this.texture = this.frames[frameNumber];
  }
}
