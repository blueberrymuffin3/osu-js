import { Container, DisplayObject } from "pixi.js";

export interface IUpdatable {
  update(timeMs: number): void;
}

export interface TimelineElement<Instance> {
  startTimeMs: number;
  endTimeMs: number;
  build: () => Instance;
}

interface TimelineElementState<Instance> {
  endTimeMs: number;
  instance: Instance;
}

type TimelineCallback<Instance> = (instance: Instance, timeMs: number) => void;

export class Timeline<Instance> implements IUpdatable {
  private allowSkippingElements: boolean;

  private nextElementIndex = 0;
  private elements: TimelineElement<Instance>[];
  private activeElements = new Set<TimelineElementState<Instance>>();

  private createElement: TimelineCallback<Instance> | null;
  private updateElement: TimelineCallback<Instance> | null;
  private destroyElement: TimelineCallback<Instance> | null;

  public constructor(
    elements: TimelineElement<Instance>[],
    createElement: TimelineCallback<Instance> | null,
    updateElement: TimelineCallback<Instance> | null,
    destroyElement: TimelineCallback<Instance> | null,
    allowSkippingElements: boolean
  ) {
    this.elements = elements
      .slice()
      .sort((a, b) => a.startTimeMs - b.startTimeMs);

    this.createElement = createElement;
    this.updateElement = updateElement;
    this.destroyElement = destroyElement;
    this.allowSkippingElements = allowSkippingElements;
  }

  public update(timeMs: number) {
    for (
      ;
      this.nextElementIndex < this.elements.length &&
      this.elements[this.nextElementIndex].startTimeMs <= timeMs;
      this.nextElementIndex++
    ) {
      const nextElement = this.elements[this.nextElementIndex];

      const hasEnded = timeMs >= nextElement.endTimeMs;

      if (!(hasEnded && this.allowSkippingElements)) {
        const nextElementState: TimelineElementState<Instance> = {
          instance: nextElement.build(),
          endTimeMs: nextElement.endTimeMs,
        };
        this.createElement?.(nextElementState.instance, timeMs);
        this.activeElements.add(nextElementState);
      }
    }

    for (const element of this.activeElements) {
      if (timeMs < element.endTimeMs) {
        this.updateElement?.(element.instance, timeMs);
      } else {
        this.destroyElement?.(element.instance, timeMs);
        this.activeElements.delete(element);
      }
    }
  }
}

export type DOTimelineInstance = DisplayObject & IUpdatable;

export class DisplayObjectTimeline extends Container implements IUpdatable {
  private timeline: Timeline<DOTimelineInstance>;

  public constructor(elements: TimelineElement<DOTimelineInstance>[]) {
    super();
    this.timeline = new Timeline(
      elements,
      this.createElement,
      this.updateElement,
      this.destroyElement,
      true
    );
  }

  private createElement: TimelineCallback<DOTimelineInstance> = (instance) => {
    this.addChildAt(instance, 0);
  };
  private updateElement: TimelineCallback<DOTimelineInstance> = (
    instance,
    timeMs
  ) => {
    instance.update(timeMs);
  };
  private destroyElement: TimelineCallback<DOTimelineInstance> = (instance) => {
    instance.destroy({ children: true });
    this.removeChild(instance);
  };


  public update(timeMs: number) {
    this.timeline.update(timeMs);
  }
}

export class AudioObjectTimeline implements IUpdatable {
  private timeline: Timeline<IUpdatable>;

  public constructor(elements: TimelineElement<IUpdatable>[]) {
    this.timeline = new Timeline(
      elements,
      null,
      null,
      null,
      true,
    );
  }

  public update(timeMs: number) {
    this.timeline.update(timeMs);
  }
}
