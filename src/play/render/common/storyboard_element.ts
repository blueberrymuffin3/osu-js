import {
  Command,
  IStoryboardElement,
  StoryboardSprite,
} from "osu-classes";

import { BLEND_MODES, Sprite, utils } from "pixi.js";
import { STORYBOARD_BRIGHTNESS, STORYBOARD_ORIGIN_MAP } from "../../constants";
import { IUpdatable, Timeline, TimelineElement } from "../../game/timeline";

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

  constructor(object: T) {
    super(object);

    this.position.copyFrom(object.startPosition);
    this.anchor.copyFrom(STORYBOARD_ORIGIN_MAP.get(object.origin)!);

    this.commandTimeline = new Timeline(
      object.commands.map(this.createElement),
      null,
      this.updateCommand,
      this.finalizeCommand,
      false
    );

    this.setValues();
  }

  private createElement = (command: Command): TimelineElement<Command> => ({
    startTimeMs: command.startTime,
    endTimeMs: command.endTime,
    build: () => command,
  });

  private updateCommand = (command: Command, timeMs: number) => {
    this.applyCommand(command, command.getProgress(timeMs));
  };

  private finalizeCommand = (command: Command) => {
    this.applyCommand(command, 1);
  };

  private applyCommand(command: Command, progress: number) {
    this.object.setValueFromCommand(command, progress);
  }

  private setValues(): void {
    this.tint = utils.rgb2hex([
      (this.object.color.red / 255) * STORYBOARD_BRIGHTNESS,
      (this.object.color.green / 255) * STORYBOARD_BRIGHTNESS,
      (this.object.color.blue / 255) * STORYBOARD_BRIGHTNESS,
    ]);

    this.alpha = this.object.color.alpha;
    this.x = this.object.startX;
    this.y = this.object.startY;
    this.rotation = this.object.rotation;
    this.scale.x = (this.object.flipX ? -1 : 1) * this.object.scale.x;
    this.scale.y = (this.object.flipY ? -1 : 1) * this.object.scale.y;
    this.blendMode = this.object.isAdditive 
      ? BLEND_MODES.ADD 
      : BLEND_MODES.NORMAL;
  }

  update(timeMs: number): void {
    this.commandTimeline.update(timeMs);
  }
}
