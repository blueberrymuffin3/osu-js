/**
 * Notes from osu!wiki
 *
 * Storyboard scripting/General rules for storyboarding:
 *  By default, the preview background (the background you see in Song Select) specified for the map is placed below all other layers. However, if you reference that same file as an object in your storyboard, it will disappear immediately after the map loads.
 * Commands from the .osb file take precedence over those from the .osu file within the layers, as if the commands from the .osb were appended to the end of the .osu commands. This does not overrule the four layers mentioned above. Example: https://osu.ppy.sh/community/forums/topics/1869?n=103.
 */

import {
  Command,
  CommandLoop,
  CommandType,
  IHasCommands,
  IStoryboardElement,
  LoopType,
  Origins,
  ParameterType,
  StoryboardAnimation,
  StoryboardSprite,
  Vector2,
} from "osu-classes";

import {
  BLEND_MODES,
  Container,
  Graphics,
  IPointData,
  Rectangle,
  Sprite,
  Texture,
  utils,
} from "pixi.js";
import { POLICY } from "../adaptive-scale";
import { EasingFunctions, lerp, lerpRGB } from "../anim";
import { LoadedBeatmap } from "../api/beatmap-loader";
import {
  adaptiveScaleDisplayObject,
  getAllFramePaths,
  OSU_PIXELS_SCREEN_SIZE,
} from "../constants";
import {
  DisplayObjectTimeline,
  DOTimelineInstance,
  IUpdatable,
  Timeline,
  TimelineElement,
} from "./timeline";

export class StoryboardLayerTimeline extends Container {
  private backgroundSprite: Sprite | null = null;
  private timeline: DisplayObjectTimeline;
  private storyboardResources: Map<string, Texture>;

  public constructor(
    {
      storyboardResources,
      storyboard,
      background,
      data: beatmap,
    }: LoadedBeatmap,
    layer: keyof typeof LayerType
  ) {
    super();
    this.storyboardResources = storyboardResources;

    if (
      layer === "Background" &&
      background &&
      beatmap.events.background &&
      !storyboardResources.has(beatmap.events.background)
    ) {
      // Background not referenced in storyboard, so it should always be rendered behind everything else
      this.backgroundSprite = new Sprite(background);
      adaptiveScaleDisplayObject(
        STORYBOARD_STANDARD_RECT,
        background,
        this.backgroundSprite,
        POLICY.FullHeight
      );

      this.backgroundSprite.tint = utils.rgb2hex([
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
        STORYBOARD_BRIGHTNESS,
      ]);

      this.addChild(this.backgroundSprite);
    }

    if (!beatmap.general.widescreenStoryboard) {
      STORYBOARD_STANDARD_MASK.setParent(this);
      this.mask = STORYBOARD_STANDARD_MASK;
    }

    const elements = storyboard
      .getLayerByName(layer)
      .elements.map(this.createElement)
      .filter((e) => e != null) as TimelineElement<DOTimelineInstance>[];

    this.timeline = new DisplayObjectTimeline(elements);

    this.addChild(this.timeline);
  }

  private childOrderDirty = false;

  private createElement = (
    object: IStoryboardElement,
    index: number
  ): TimelineElement<DOTimelineInstance> | null => {
    const commandObject = object as IStoryboardElement & IHasCommands;

    // Not every storyboard element has command timelines.
    if (!commandObject.timelineGroup?.commands.length) {
      console.warn("Object has no commands", object);

      return null;
    }

    const startTimeMs = commandObject.timelineGroup.commandsStartTime;
    const endTimeMs = commandObject.timelineGroup.commandsEndTime;

    if (object instanceof StoryboardAnimation) {
      return {
        startTimeMs,
        endTimeMs,
        build: () => {
          this.childOrderDirty = true;

          const animation = new StoryboardAnimationRenderer(
            this.storyboardResources,
            object
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

          const sprite = new StoryboardSpriteRenderer(
            this.storyboardResources,
            object
          );
          sprite.zIndex = index;
          return sprite;
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
