import {
  Command,
  CommandLoop,
  CommandType,
  IStoryboardElement,
  ParameterType,
  StoryboardSprite,
  Vector2,
} from "osu-classes";

import { BLEND_MODES, Sprite, utils } from "pixi.js";
import { EasingFunctions, lerp, lerpRGB } from "../../anim";
import { STORYBOARD_BRIGHTNESS, STORYBOARD_ORIGIN_MAP } from "../../constants";
import { IUpdatable, Timeline, TimelineElement } from "../../game/timeline";

const BACKTRACK_DEFAULT_VALUE_CLASSES = [
  ["S", "V"],
  ["C"],
  ["R"],
  ["C"],
  ["P"],
  ["F"],
] as readonly CommandType[][];

export abstract class DrawableStoryboardElement<T extends IStoryboardElement>
  extends Sprite
  implements IUpdatable
{
  protected object: T;

  constructor(object: T) {
    super();
    this.object = object;

    this.tint = utils.rgb2hex([
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
      STORYBOARD_BRIGHTNESS,
    ]);
  }
  
  abstract update(timeMs: number): void;
}

export abstract class DrawableStoryboardElementWithCommands
  <T extends StoryboardSprite>
  extends DrawableStoryboardElement<T>
{
  private commandTimeline: Timeline<Command>;
  private scalePositive = new Vector2(1, 1);
  private isParameterActive: Record<ParameterType, boolean> = {
    "": false,
    H: false,
    A: false,
    V: false,
  };

  constructor(object: T) {
    super(object);

    this.position.copyFrom(object.startPosition);
    this.anchor.copyFrom(STORYBOARD_ORIGIN_MAP.get(object.origin)!);

    const timelineCommands = this.getTimelineCommands();
    
    // TODO: Triggers
    this.commandTimeline = new Timeline(
      timelineCommands.map(this.createElement),
      () => {},
      this.updateCommand,
      this.finalizeCommand,
      false
    );
    
    // Setup default values
    for (const classTypes of BACKTRACK_DEFAULT_VALUE_CLASSES) {
      for (const command of timelineCommands) {
        if (classTypes.includes(command.type)) {
          this.updateCommand(command, 0);
          break;
        }
      }
    }

    // Setup default position
    let xPosSet = false;
    let yPosSet = false;
    for (const command of timelineCommands) {
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
    const { startTime, endTime, easing } = command;

    if (endTime > startTime) {
      const p = (timeMs - startTime) / (endTime - startTime);
      const easingFn = EasingFunctions.getEasingFn(easing);

      this.applyCommand(command, easingFn(p));
    } else {
      this.applyCommand(command, timeMs >= startTime ? 1 : 0);
    }
  };

  private finalizeCommand = (command: Command) => {
    this.applyCommand(command, 1);
  };

  private applyCommand(command: Command, p: number) {
    const { startTime, endTime, startValue, endValue, parameter } = command;

    switch (command.type) {
      case CommandType.Parameter: {
        // BlendingCommand, HorizontalFlipCommand, and VerticalFlipCommand
        // Active for the duration of the command
        // If endTime == startTime, it's applied forever (?)
        this.isParameterActive[parameter] = p < 1 || startTime === endTime;
        return;
      }
      case CommandType.Color: {
        const { red, green, blue } = lerpRGB(p, startValue, endValue);

        this.tint = utils.rgb2hex([
          (red / 255) * STORYBOARD_BRIGHTNESS,
          (green / 255) * STORYBOARD_BRIGHTNESS,
          (blue / 255) * STORYBOARD_BRIGHTNESS,
        ]);

        return;
      }
      case CommandType.Fade: {
        this.alpha = lerp(p, startValue, endValue);
        return;
      }
      case CommandType.Movement: {
        this.x = lerp(p, startValue.x, endValue.x);
        this.y = lerp(p, startValue.y, endValue.y);
        return;
      }
      case CommandType.MovementX: {
        this.x = lerp(p, startValue, endValue);
        return;
      }
      case CommandType.MovementY: {
        this.y = lerp(p, startValue, endValue);
        return;
      }
      case CommandType.Rotation: {
        this.rotation = lerp(p, startValue, endValue);
        return;
      }
      case CommandType.Scale: {
        const scale = lerp(p, startValue, endValue);

        this.scalePositive.x = scale;
        this.scalePositive.y = scale;
        return;
      }
      case CommandType.VectorScale: {
        this.scalePositive.x = lerp(p, startValue.x, endValue.x);
        this.scalePositive.y = lerp(p, startValue.y, endValue.y);
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

  private getTimelineCommands(): Command[] {
    // Combine all commands, loops and triggers into one action timeline.
    // TODO: Triggers
    const timelineCommands = [
      ...this.object.timelineGroup.commands,
      ...this.object.loops.flatMap(this.unrollLoopCommand),
    ];

    return timelineCommands.sort((a, b) => a.startTime - b.startTime);
  }

  private unrollLoopCommand(loop: CommandLoop): Command[] {
    const baseCommands = loop.commands;

    if (baseCommands.length == 0) {
      console.warn("Loop has no valid commands");
      return [];
    }

    const unrolledCommands: Command[][] = [];
    const commandsDuration = loop.commandsDuration;
    const totalIterations = loop.totalIterations;

    for (let i = 0; i < totalIterations; i++) {
      const iterationStartTime = loop.loopStartTime + i * commandsDuration;

      const cloned = baseCommands.map((command) => {
        return new Command({
          ...command,
          startTime: command.startTime + iterationStartTime,
          endTime: command.endTime + iterationStartTime,
        });
      });

      unrolledCommands.push(cloned);
    }

    return unrolledCommands.flat();
  }
}
