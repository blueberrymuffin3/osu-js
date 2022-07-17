import { Container, DisplayObject } from "pixi.js";

export interface UpdatableDisplayObject extends DisplayObject {
  update(timeMs: number): void;
}

export interface TimelineElement {
  startTimeMs: number;
  endTimeMs: number;
  build: () => UpdatableDisplayObject;
}

interface TimelineElementState {
  endTimeMs: number;
  instance: UpdatableDisplayObject;
}

export abstract class Timeline
  extends Container
  implements UpdatableDisplayObject
{
  private nextElementIndex = 0;
  private elements: TimelineElement[];
  private activeElements = new Set<TimelineElementState>();

  protected constructor(elements: TimelineElement[]) {
    super();
    this.elements = elements;
  }

  public update(timeMs: number) {
    for (const element of this.activeElements) {
      if (timeMs < element.endTimeMs) {
        element.instance.update(timeMs);
      } else {
        element.instance.destroy({ children: true });
        this.activeElements.delete(element);
      }
    }

    for (
      ;
      this.nextElementIndex < this.elements.length &&
      this.elements[this.nextElementIndex].startTimeMs <= timeMs;
      this.nextElementIndex++
    ) {
      const nextElement = this.elements[this.nextElementIndex];

      if (timeMs < nextElement.endTimeMs) {
        const nextElementState: TimelineElementState = {
          instance: nextElement.build(),
          endTimeMs: nextElement.endTimeMs,
        };
        this.addChildAt(nextElementState.instance, 0);
        nextElementState.instance.update(timeMs);
        this.activeElements.add(nextElementState);
      } else {
        console.warn(
          "Skipping element, expired before being instantiated",
          nextElement
        );
      }
    }
  }
}
