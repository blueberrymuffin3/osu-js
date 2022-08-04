/**
 * Notes from osu!wiki
 *
 * Storyboard scripting/General rules for storyboarding:
 *  By default, the preview background (the background you see in Song Select) specified for the map is placed below all other layers. However, if you reference that same file as an object in your storyboard, it will disappear immediately after the map loads.
 * Commands from the .osb file take precedence over those from the .osu file within the layers, as if the commands from the .osb were appended to the end of the .osu commands. This does not overrule the four layers mentioned above. Example: https://osu.ppy.sh/community/forums/topics/1869?n=103.
 */

import { Command, CommandType, IHasCommands, IStoryboardElement, Origins, ParameterType, StoryboardAnimation, StoryboardSprite, Vector2 } from "osu-classes";

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

    const elements = storyboard.getLayerByName(layer).elements
      .map((e, i) => this.createElement(e as IStoryboardElement & IHasCommands, i))
      .filter((e) => e != null) as TimelineElement<DOTimelineInstance>[];

    this.timeline = new DisplayObjectTimeline(elements);

    this.addChild(this.timeline);
  }

  private childOrderDirty = false;

  private createElement = (
    object: IStoryboardElement & IHasCommands,
    index: number
  ): TimelineElement<DOTimelineInstance> | null => {
    if (!object.timelineGroup.commands?.length) {
      console.warn("Object has no commands", object);

      return null;
    }

    const startTimeMs = object.timelineGroup.commandsStartTime;
    const endTimeMs = object.timelineGroup.commandsEndTime;

    if (object instanceof StoryboardAnimation) {
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
    }
    
    if (object instanceof StoryboardSprite) {
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
    } 
      
    console.warn("Unknown storyboard element", object);

    return null;
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
] as readonly CommandType[][];

abstract class StoryboardRendererBase<T extends StoryboardSprite>
  extends Sprite
  implements IUpdatable
{
  private commandTimeline: Timeline<Command>;
  private scalePositive = new Vector2(1, 1);
  private isParameterActive: Record<ParameterType, boolean> = {
    "": false,
    H: false,
    A: false,
    V: false,
  };

  protected object: T;

  constructor(object: T) {
    super();
    this.object = object;
    this.position.copyFrom(object.startPosition);
    this.anchor.copyFrom(ORIGIN_MAP.get(object.origin)!);

    const commandsDefault = object.timelineGroup.commands;
    
    // TODO: Triggers
    this.commandTimeline = new Timeline(
      commandsDefault.map(this.createElement),
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

    // Setup default values
    for (const classTypes of BACKTRACK_DEFAULT_VALUE_CLASSES) {
      for (const command of commandsDefault) {
        if (classTypes.includes(command.type)) {
          this.updateCommand(command, 0);
          break;
        }
      }
    }

    // Setup default position
    let xPosSet = false;
    let yPosSet = false;
    for (const command of commandsDefault) {
      if (command.type === CommandType.Movement) {
        if (!xPosSet) {
          this.x = command.startValue.x;
        }
        if (!yPosSet) {
          this.y = command.startValue.y;
        }
        break;
      } else if (command.type === CommandType.MovementX) {
        if (!xPosSet) {
          this.x = command.startValue;
          xPosSet = true;
        }
      } else if (command.type === CommandType.MovementY) {
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
    switch (command.type) {
      case CommandType.Parameter: {
        // BlendingCommand, HorizontalFlipCommand, and VerticalFlipCommand
        // Active for the duration of the command
        // If endTime == startTime, it's applied forever (?)
        this.isParameterActive[command.parameter] =
          p < 1 || command.startTime === command.endTime;
        
        return;
      }
      case CommandType.Color: {
        const { red, green, blue } = lerpRGB(p, command.startValue, command.endValue);

        this.tint = utils.rgb2hex([
          (red / 255) * STORYBOARD_BRIGHTNESS,
          (green / 255) * STORYBOARD_BRIGHTNESS,
          (blue / 255) * STORYBOARD_BRIGHTNESS,
        ]);
        return;
      }
      case CommandType.Fade: {
        this.alpha = lerp(p, command.startValue, command.endValue);
        return;
      }
      case CommandType.Movement: {
        this.x = lerp(p, command.startValue.x, command.endValue.x);
        this.y = lerp(p, command.startValue.y, command.endValue.y);
        return;
      }
      case CommandType.MovementX: {
        this.x = lerp(p, command.startValue, command.endValue);
        return;
      }
      case CommandType.MovementY: {
        this.y = lerp(p, command.startValue, command.endValue);
        return;
      }
      case CommandType.Rotation: {
        this.rotation = lerp(p, command.startValue, command.endValue);
        return;
      }
      case CommandType.Scale: {
        const scale = lerp(p, command.startValue, command.endValue);
        
        this.scalePositive.x = scale;
        this.scalePositive.y = scale;
        return;
      }
      case CommandType.VectorScale: {
        this.scalePositive.x = lerp(p, command.startValue.x, command.endValue.x);
        this.scalePositive.y = lerp(p, command.startValue.y, command.endValue.y);
        return;
      }
    }
    
    console.warn("Unknown command", command);
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

class StoryboardSpriteRenderer extends StoryboardRendererBase<StoryboardSprite> {
  public constructor(
    storyboardResources: Map<string, Texture>,
    object: StoryboardSprite
  ) {
    super(object);
    this.texture = storyboardResources.get(object.filePath) ?? Texture.EMPTY;
    if (this.texture == Texture.EMPTY) {
      console.warn("Sprite has no texture");
    }
  }
}

class StoryboardAnimationRenderer extends StoryboardRendererBase<StoryboardAnimation> {
  private frames: Texture[];

  public constructor(
    storyboardResources: Map<string, Texture>,
    object: StoryboardAnimation
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
