import SOUND_TRACK_TRIANGLES from "./triangles.mp3";
import SOUND_INTRO_SEEYA from "./osu/osu.Game.Resources/Samples/Intro/seeya.mp3";

import { sound } from "@pixi/sound";
sound.add(
  Object.fromEntries(
    [SOUND_TRACK_TRIANGLES, SOUND_INTRO_SEEYA].map((url) => [url, url])
  )
);

export { SOUND_TRACK_TRIANGLES, SOUND_INTRO_SEEYA };
