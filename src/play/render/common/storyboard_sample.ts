import { Howl } from "howler";
import { StoryboardSample } from "osu-classes";

export class PlayableStoryboardSample {
  declare sound: Howl | null;
  declare soundId: number;

  constructor(object: StoryboardSample, samples: Map<string, Howl>) {
    this.sound = samples.get(object.filePath) ?? null;

    if (!this.sound) return;

    this.sound.once("end", () => this.sound!.unload());
    this.soundId = this.sound.play();
    this.sound.volume(object.volume / 100, this.soundId);
  }
}