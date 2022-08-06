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
  StoryboardVideo,
  IStoryboardElementWithDuration,
  IHasCommands,
} from "osu-classes";

import {
  Container,
  Texture,
} from "pixi.js";

import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  TimelineElement,
} from "./timeline";

import { 
  STORYBOARD_STANDARD_MASK, 
} from "../constants";

import { DrawableStoryboardAnimation } from "../render/common/storyboard_animation";
import { DrawableStoryboardSprite } from "../render/common/storyboard_sprite";
import { DrawableStoryboardVideo } from "../render/common/storyboard_video";
import { LoadedBeatmap } from "../loader/util";

export class StoryboardLayerTimeline extends Container {
  private timeline: DisplayObjectTimeline;
  private storyboardResources: Map<string, Texture>;

  constructor(beatmap: LoadedBeatmap, layer: keyof typeof LayerType) {
    super();

    this.storyboardResources = beatmap.storyboardResources;

    const currentLayer = beatmap.storyboard.getLayerByName(layer);
    const isWidescreen = beatmap.data.general.widescreenStoryboard;

    // Mask all storyboard layers that require masking if storyboard is 4:3.
    if (!isWidescreen && currentLayer.masking) {
      STORYBOARD_STANDARD_MASK.setParent(this);
      this.mask = STORYBOARD_STANDARD_MASK;
    }

    const elements = currentLayer
      .elements.map((el, index) => this.createElement(el, beatmap, index))
      .filter((e) => e != null) as TimelineElement<DOTimelineInstance>[];

    this.timeline = new DisplayObjectTimeline(elements);

    this.addChild(this.timeline);
  }

  private childOrderDirty = false;

  private createElement = (
    object: IStoryboardElement,
    beatmap: LoadedBeatmap,
    index: number
  ): TimelineElement<DOTimelineInstance> | null => {
    const durationObj = object as IStoryboardElementWithDuration;
    const commandsObj = object as IStoryboardElement & IHasCommands;

    if (commandsObj.timelineGroup) {
      const hasCommands = commandsObj.timelineGroup.commands.length > 0;
      const hasLoops = commandsObj.loops.length > 0;
      const hasTriggers = commandsObj.triggers.length > 0;

      if (!hasCommands && !hasLoops && !hasTriggers) {
        console.warn("Object has no commands", object);

        return null;
      }
    }

    const startTimeMs = object.startTime;
    const endTimeMs = durationObj.endTime ?? object.startTime;

    if (object instanceof StoryboardAnimation) {
      return {
        startTimeMs,
        endTimeMs,
        build: () => {
          this.childOrderDirty = true;

          const animation = new DrawableStoryboardAnimation(
            object,
            this.storyboardResources,
          );
          animation.zIndex = index;
          return animation;
        },
      };
    }

    if (object instanceof StoryboardSprite) {
      return {
        startTimeMs,
        endTimeMs,
        build: () => {
          this.childOrderDirty = true;

          const sprite = new DrawableStoryboardSprite(
            object,
            this.storyboardResources,
          );
          sprite.zIndex = index;
          return sprite;
        },
      };
    }

    if (object instanceof StoryboardVideo) {
      return {
        startTimeMs,
        endTimeMs: Infinity,
        build: () => {
          this.childOrderDirty = true;

          const video = new DrawableStoryboardVideo(object, beatmap);
          video.zIndex = index;
          return video;
        },
      };
    }

    console.warn("Unknown storyboard element", object);

    return null;
  };

  public update(timeMs: number) {
    this.childOrderDirty = false;
    this.timeline.update(timeMs);
    if (this.childOrderDirty) {
      this.timeline.sortChildren();
    }
  }
}
