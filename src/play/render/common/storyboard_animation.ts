import { LoopType, StoryboardAnimation } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElementWithCommands } from "./storyboard_element";
import { getAllFramePaths } from "../../constants";

export class DrawableStoryboardAnimation
  extends DrawableStoryboardElementWithCommands<StoryboardAnimation> 
{
  private frames: Texture[];
  protected startTime: number;

  public constructor(
    object: StoryboardAnimation,
    storyboardResources: Map<string, Texture>,
  ) {
    super(object);

    /*
    TODO: This is incorrect, but works for 99% of maps
    The only map I've seen it affect is https://osu-js.pages.dev/play/?1006822

    I believe osu!stable calculates from the first *visible* frame.
    This is hard to calculate because it's very dependent on the internal logic of osu!stable
    and of the interactions between parameters, color, scale, alpha, and maybe even position?

    osu!lazer currently (2020-8-5) uses this flawed/simplified logic:
    */
    this.startTime = object.startTime;

    this.frames = getAllFramePaths(object).map(
      (path) => storyboardResources.get(path) ?? Texture.EMPTY
    );
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
