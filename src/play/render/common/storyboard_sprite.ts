import { StoryboardSprite } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElementWithCommands } from "./storyboard_element";

export class DrawableStoryboardSprite 
  extends DrawableStoryboardElementWithCommands<StoryboardSprite> 
{
  constructor(
    object: StoryboardSprite,
    storyboardResources: Map<string, Texture>,
  ) {
    super(object);
    this.texture = storyboardResources.get(object.filePath) ?? Texture.EMPTY;
    if (this.texture == Texture.EMPTY) {
      console.warn("Sprite has no texture");
    }
  }
}