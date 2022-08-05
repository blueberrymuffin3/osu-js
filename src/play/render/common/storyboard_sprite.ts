import { StoryboardSprite } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElement } from "./storyboard_element";

export class DrawableStoryboardSprite 
  extends DrawableStoryboardElement<StoryboardSprite> 
{
  constructor(
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