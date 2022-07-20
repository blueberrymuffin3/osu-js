/**
 * Notes from osu!wiki
 *
 * Storyboard scripting/General rules for storyboarding:
 *  By default, the preview background (the background you see in Song Select) specified for the map is placed below all other layers. However, if you reference that same file as an object in your storyboard, it will disappear immediately after the map loads.
 * Commands from the .osb file take precedence over those from the .osu file within the layers, as if the commands from the .osb were appended to the end of the .osu commands. This does not overrule the four layers mentioned above. Example: https://osu.ppy.sh/community/forums/topics/1869?n=103.
 */

import {
  ColourCommand,
  Command,
  FadeCommand,
  IStoryboardElement,
  MoveCommand,
  MoveXCommand,
  MoveYCommand,
  Origins,
  ParameterCommand,
  ParameterType,
  RotateCommand,
  ScaleCommand,
  Storyboard,
  StoryboardAnimation,
  StoryboardSprite,
  Vector2,
  VectorScaleCommand,
} from "osu-classes";
import {
  BLEND_MODES,
  Container,
  IPointData,
  Sprite,
  Texture,
  utils,
} from "pixi.js";
import { EasingFunctions, lerp, lerp2D } from "../anim";
import {
  getAllFramePaths,
} from "../constants";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  IUpdatable,
  Timeline,
  TimelineElement,
} from "./timeline";

// TODO: What is the overlay layer? Does anyone use it?

const VISIBLE_LAYERS: ["background", "pass", "foreground"] = [
  "background",
  "pass",
  "foreground",
];

// Dimming each sprite individually allows for "overexposure" with additive blending
const STORYBOARD_BRIGHTNESS = 0.2;

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

type LayerMap<T> = {
  background: T;
  pass: T;
  foreground: T;
};

export class StoryboardTimeline extends Container {
  private timelines: LayerMap<DisplayObjectTimeline>;
  private storyboardResources: Map<string, Texture>;

  public constructor(
    storyboardResources: Map<string, Texture>,
    storyboard: Storyboard
  ) {
    super();
    this.storyboardResources = storyboardResources;

    this.timelines = Object.fromEntries<DisplayObjectTimeline>(
      VISIBLE_LAYERS.map((layer) => [
        layer,
        new DisplayObjectTimeline(storyboard[layer].map(this.createElement)),
      ])
    ) as LayerMap<DisplayObjectTimeline>;

    for (const layer of VISIBLE_LAYERS) {
      this.addChild(this.timelines[layer]);
    }
  }

  private createElement = (
    element: IStoryboardElement,
    index: number
  ): TimelineElement<DOTimelineInstance> => {
    if (element instanceof StoryboardAnimation) {
      return {
        startTimeMs: element.startTime,
        endTimeMs: element.endTime,
        build: () => {
          const animation = new StoryboardAnimationRenderer(
            this.storyboardResources,
            element
          );
          animation.zIndex = index;
          return animation;
        },
      };
    } else if (element instanceof StoryboardSprite) {
      return {
        startTimeMs: element.startTime,
        endTimeMs: element.endTime,
        build: () => {
          const sprite = new StoryboardSpriteRenderer(
            this.storyboardResources,
            element
          );
          sprite.zIndex = index;
          return sprite;
        },
      };
    }

    console.warn("Unknown storyboard element", element);
    return {
      startTimeMs: -1,
      endTimeMs: -1,
      build: () => {
        throw new Error("unreachable");
      },
    };
  };

  public update(timeMs: number) {
    for (const layer of VISIBLE_LAYERS) {
      this.timelines[layer].update(timeMs);
      this.timelines[layer].sortChildren(); // TODO: Do this on insert only
    }
  }
}

abstract class StoryboardRendererBase<T extends StoryboardSprite>
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

  protected element: T;

  constructor(element: T) {
    super();
    this.element = element;
    this.position.copyFrom(element.startPosition);
    this.anchor.copyFrom(ORIGIN_MAP.get(element.origin)!);
    // TODO: Loops
    // TODO: Triggers
    this.commandTimeline = new Timeline(
      element.commands.map(this.createElement),
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
  }

  private createElement = (command: Command): TimelineElement<Command> => ({
    startTimeMs: command.startTime,
    endTimeMs: command.endTime,
    build: () => command,
  });

  private updateCommand = (command: Command, timeMs: number) => {
    const p = (timeMs - command.startTime) / command.duration;
    this.applyCommand(command, EasingFunctions.getEasingFn(command.easing)(p));
  };

  private finalizeCommand = (command: Command) => {
    this.applyCommand(command, 1);
  };

  private applyCommand(command: Command, p: number) {
    if (command instanceof ParameterCommand) {
      // BlendingCommand, HorizontalFlipCommand, and VerticalFlipCommand
      // Active for the duration of the command
      this.isParameterActive[command.parameter] = p < 1;
    } else if (command instanceof ColourCommand) {
      const r = lerp(p, command.startRed, command.endRed);
      const g = lerp(p, command.startGreen, command.endGreen);
      const b = lerp(p, command.startBlue, command.endBlue);
      this.tint = utils.rgb2hex([
        (r / 255) * STORYBOARD_BRIGHTNESS,
        (g / 255) * STORYBOARD_BRIGHTNESS,
        (b / 255) * STORYBOARD_BRIGHTNESS,
      ]);
    } else if (command instanceof FadeCommand) {
      this.alpha = lerp(p, command.startOpacity, command.endOpacity);
    } else if (command instanceof MoveCommand) {
      this.x = lerp(p, command.startX, command.endX);
      this.y = lerp(p, command.startY, command.endY);
    } else if (command instanceof MoveXCommand) {
      this.x = lerp(p, command.startX, command.endX);
    } else if (command instanceof MoveYCommand) {
      this.y = lerp(p, command.startY, command.endY);
    } else if (command instanceof RotateCommand) {
      this.rotation = lerp(p, command.startRotate, command.endRotate);
    } else if (
      command instanceof ScaleCommand ||
      command instanceof VectorScaleCommand
    ) {
      this.scalePositive = lerp2D(p, command.startScale, command.endScale);
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

class StoryboardSpriteRenderer extends StoryboardRendererBase<StoryboardSprite> {
  public constructor(
    storyboardResources: Map<string, Texture>,
    element: StoryboardSprite
  ) {
    super(element);
    this.texture = storyboardResources.get(element.filePath) ?? Texture.EMPTY;
    if (this.texture == Texture.EMPTY) {
      console.warn("Sprite has no texture");
    }
  }
}

class StoryboardAnimationRenderer extends StoryboardRendererBase<StoryboardAnimation> {
  private frames: Texture[];

  public constructor(
    storyboardResources: Map<string, Texture>,
    element: StoryboardAnimation
  ) {
    super(element);
    this.frames = getAllFramePaths(element).map(
      (path) => storyboardResources.get(path) ?? Texture.EMPTY
    );
    if (this.frames.findIndex((x) => x == Texture.EMPTY) >= 0) {
      console.warn("Animation missing frames");
    }
    console.log("anim");
    this.texture = this.frames[0];
  }

  update(timeMs: number): void {
    super.update(timeMs);

    let frameNumber = Math.floor(
      (timeMs - this.element.startTime) / this.element.frameDelay
    );
    if (this.element.loop) {
      frameNumber = frameNumber % this.frames.length;
    } else {
      frameNumber = Math.min(frameNumber, this.frames.length - 1);
    }
    this.texture = this.frames[frameNumber];
  }
}
