import { Howl } from "howler";
import { StoryboardSample } from "osu-classes";

export class PlayableStoryboardSample {
  sound: Howl | null;

  constructor(object: StoryboardSample, samples: Map<string, Howl>) {
    this.sound = samples.get(object.filePath) ?? null;

    if (!this.sound) return;

    this.sound.once("end", () => this.sound!.unload());
    this.sound.volume(object.volume / 100);
    this.sound.play();
  }
}