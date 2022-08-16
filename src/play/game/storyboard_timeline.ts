/**
 * Notes from osu!wiki
 *
 * Storyboard scripting/General rules for storyboarding:
 *  By default, the preview background (the background you see in Song Select) specified for the map is placed below all other layers. However, if you reference that same file as an object in your storyboard, it will disappear immediately after the map loads.
 * Commands from the .osb file take precedence over those from the .osu file within the layers, as if the commands from the .osb were appended to the end of the .osu commands. This does not overrule the four layers mentioned above. Example: https://osu.ppy.sh/community/forums/topics/1869?n=103.
 */

import {
  IStoryboardElement,
  LayerType,
  StoryboardSprite,
  StoryboardAnimation,
  IHasCommands,
  StoryboardSample,
} from "osu-classes";

import { Container, Texture } from "pixi.js";

import {
  AudioObjectTimeline,
  DisplayObjectTimeline,
  TimelineElement,
} from "./timeline";

import { STORYBOARD_STANDARD_MASK } from "../constants";

import { DrawableStoryboardAnimation } from "../render/common/storyboard_animation";
import { DrawableStoryboardSprite } from "../render/common/storyboard_sprite";
import { LoadedBeatmap } from "../loader/util";
import { PlayableStoryboardSample } from "../render/common/storyboard_sample";
import { Howl } from "howler";

export class StoryboardLayerTimeline extends Container {
  private displayTimeline: DisplayObjectTimeline;
  private audioTimeline: AudioObjectTimeline;
  private storyboardImages: Map<string, Texture>;
  private storyboardSamples: Map<string, Howl>;

  constructor(beatmap: LoadedBeatmap, layer: keyof typeof LayerType) {
    super();

    this.storyboardImages = beatmap.storyboardImages;
    this.storyboardSamples = beatmap.storyboardSamples;

    const currentLayer = beatmap.storyboard.getLayerByName(layer);
    const isWidescreen = beatmap.data.general.widescreenStoryboard;

    // Mask all storyboard layers that require masking if storyboard is 4:3.
    if (!isWidescreen && currentLayer.masking) {
      STORYBOARD_STANDARD_MASK.setParent(this);
      this.mask = STORYBOARD_STANDARD_MASK;
    }

    const elements = currentLayer.elements;
    const displayElements = [];
    const audioElements = [];

    for (let i = 0; i < elements.length; ++i) {
      const created = this.createElement(elements[i], i);

      if (!created) continue;

      if (elements[i] instanceof StoryboardSample) {
        audioElements.push(created);
      } else {
        displayElements.push(created);
      }
    }

    this.displayTimeline = new DisplayObjectTimeline(displayElements);
    this.audioTimeline = new AudioObjectTimeline(audioElements);

    this.addChild(this.displayTimeline);
  }

  private childOrderDirty = false;

  private createElement = (
    object: IStoryboardElement,
    index: number
  ): TimelineElement<any> | null => {
    const commandsObj = object as IStoryboardElement & IHasCommands;

    if (commandsObj.timelineGroup) {
      const hasCommands = commandsObj.timelineGroup.commands.length > 0;
      const hasLoops = commandsObj.loops.length > 0;

      if (!hasCommands && !hasLoops) {
        console.warn("Object has no commands", object);

        return null;
      }
    }

    if (object instanceof StoryboardAnimation) {
      return this.createAnimation(object, index);
    }

    if (object instanceof StoryboardSprite) {
      return this.createSprite(object, index);
    }

    if (object instanceof StoryboardSample) {
      return this.createSample(object);
    }

    console.warn("Unknown storyboard element", object);

    return null;
  };

  private createAnimation(animation: StoryboardAnimation, index: number) {
    return {
      startTimeMs: animation.startTime,
      endTimeMs: animation.endTime,
      build: () => {
        this.childOrderDirty = true;

        const drawable = new DrawableStoryboardAnimation(
          animation,
          this.storyboardImages
        );
        drawable.zIndex = index;
        return drawable;
      },
    };
  }

  private createSprite(sprite: StoryboardSprite, index: number) {
    return {
      startTimeMs: sprite.startTime,
      endTimeMs: sprite.endTime,
      build: () => {
        this.childOrderDirty = true;

        const drawable = new DrawableStoryboardSprite(
          sprite,
          this.storyboardImages
        );
        drawable.zIndex = index;
        return drawable;
      },
    };
  }

  private createSample(sample: StoryboardSample) {
    return {
      startTimeMs: sample.startTime,
      endTimeMs: sample.startTime,
      build: () => {
        return new PlayableStoryboardSample(sample, this.storyboardSamples);
      },
    };
  }

  public update(timeMs: number) {
    this.childOrderDirty = false;
    
    this.displayTimeline.update(timeMs);
    this.audioTimeline.update(timeMs);

    if (this.childOrderDirty) {
      this.displayTimeline.sortChildren();
    }
  }
}
