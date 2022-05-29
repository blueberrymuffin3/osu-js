import SOUND_INTRO_SEEYA from "./osu/osu.Game.Resources/Samples/Intro/seeya.mp3";
import BEATMAP_TRIANGES from "./osu/osu.Game.Resources/Tracks/triangles.osz?url";

import { sound } from "@pixi/sound";
sound.add(Object.fromEntries([SOUND_INTRO_SEEYA].map((url) => [url, url])));

export { SOUND_INTRO_SEEYA, BEATMAP_TRIANGES };

export const preloadSounds = [SOUND_INTRO_SEEYA, BEATMAP_TRIANGES];
