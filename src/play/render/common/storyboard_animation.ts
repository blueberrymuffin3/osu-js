import { LoopType, StoryboardAnimation } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElementWithCommands } from "./storyboard_element";
import { getAllFramePaths } from "../../constants";

export class DrawableStoryboardAnimation
  extends DrawableStoryboardElementWithCommands<StoryboardAnimation> 
{
  private frames: Texture[];
  protected startTime: number;

  constructor(object: StoryboardAnimation, textures: Map<string, Texture>) {
    super(object);

    this.startTime = object.startTime;

    this.frames = getAllFramePaths(object)
      .map((path) => textures.get(path) ?? Texture.EMPTY);

    if (this.frames.findIndex((x) => x == Texture.EMPTY) >= 0) {
      console.warn("Animation missing frames");
    }

    this.texture = this.frames[0];
  }

  update(timeMs: number): void {
    let frame = 0;

    if (this.frames.length > 0 && timeMs >= this.startTime) {
      frame = Math.floor((timeMs - this.startTime) / this.object.frameDelay);

      if (this.object.loopType === LoopType.LoopForever) {
        frame = frame % this.frames.length;
      } else {
        frame = Math.min(frame, this.frames.length - 1);
      }
    }

    this.texture = this.frames[frame];

    super.update(timeMs);
  }
}
