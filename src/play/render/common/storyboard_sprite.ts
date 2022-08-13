import { StoryboardSprite } from "osu-classes";
import { Texture } from "pixi.js";
import { DrawableStoryboardElementWithCommands } from "./storyboard_element";

export class DrawableStoryboardSprite 
  extends DrawableStoryboardElementWithCommands<StoryboardSprite> 
{
  constructor(object: StoryboardSprite, textures: Map<string, Texture>) {
    super(object);
    this.texture = textures.get(object.filePath) ?? Texture.EMPTY;
    if (this.texture == Texture.EMPTY) {
      console.warn("Sprite has no texture");
    }
  }
}