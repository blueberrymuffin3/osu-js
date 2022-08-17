import {
  Command,
  CommandType,
  IStoryboardElement,
  ParameterType,
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

    this.setDefaultValues();
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

    switch (command.type) {
      case CommandType.MovementX: return this.updateX();
      case CommandType.MovementY: return this.updateY();
      case CommandType.Rotation: return this.updateRotation();
      case CommandType.Color: return this.updateTint();
      case CommandType.Fade: return this.updateAlpha();
      case CommandType.VectorScale:
      case CommandType.Scale:
      case CommandType.Parameter:
        command.parameter !== ParameterType.BlendingMode
          ? this.updateScale()
          : this.updateBlendMode();
    }
  }

  private updateX = () => this.x = this.object.startX;
  private updateY = () => this.y = this.object.startY;
  private updateRotation = () => this.rotation = this.object.rotation;
  
  private updateTint = () => {
    this.tint = utils.rgb2hex([
      (this.object.color.red / 255) * STORYBOARD_BRIGHTNESS,
      (this.object.color.green / 255) * STORYBOARD_BRIGHTNESS,
      (this.object.color.blue / 255) * STORYBOARD_BRIGHTNESS,
    ]);
  }

  private updateAlpha = () => {
    this.alpha = this.object.color.alpha;
    this.visible = this.alpha >= 0.01;
  }

  private updateScale = () => {
    this.scale.x = (this.object.flipX ? -1 : 1) * this.object.scale.x;
    this.scale.y = (this.object.flipY ? -1 : 1) * this.object.scale.y;
  }

  private updateBlendMode = () => {
    this.blendMode = this.object.isAdditive 
      ? BLEND_MODES.ADD 
      : BLEND_MODES.NORMAL;
  }

  private setDefaultValues() {
    this.updateAlpha();
    this.updateX();
    this.updateY();
    this.updateRotation();
    this.updateScale();
    this.updateBlendMode();
    this.updateTint();
  }

  update(timeMs: number): void {
    this.commandTimeline.update(timeMs);
  }
}
