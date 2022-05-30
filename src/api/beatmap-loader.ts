import JSZip from "jszip";
import { BeatmapDecoder } from "osu-parsers-web";
import { Beatmap } from "osu-classes";

// CORS Blocked
// const getBeatmapRequest = (setId: number) =>
//   new Request(`https://osu.ppy.sh/beatmapsets/${setId}/download`);

const getBeatmapRequest = (setId: number) =>
  new Request(`https://catboy.best/d/${setId}`);

async function blobUrlFromFile(file: JSZip.JSZipObject | null) {
  if (!file) return undefined;
  const blob = await file.async("blob");
  return URL.createObjectURL(blob);
}

const _cache = caches.open("beatmap-v1");

export interface LoadedBeatmap {
  data: Beatmap;
  audioData: ArrayBuffer;
  backgroundUrl?: string;
  videoUrl?: string;
}

export async function loadBeatmap(
  setId: number,
  mapId: number
): Promise<LoadedBeatmap> {
  const cache = await _cache;
  const request = getBeatmapRequest(setId);

  let response = await cache.match(request);
  if (!response) {
    await cache.add(request);
    response = await cache.match(request);
  }
  if (!response) {
    throw new Error("Error occurred fetching beatmap");
  }

  const blob = await response.blob();
  const zip = new JSZip();
  await zip.loadAsync(blob);

  // TODO: Select Difficulty
  const osuFiles = zip.filter((path) => path.endsWith(".osu"));
  if (osuFiles.length == 0) {
    throw new Error("No .osu files found in archive");
  }

  const decoder = new BeatmapDecoder();
  let data: Beatmap | null = null;
  let _data: Beatmap;
  for (const osuFile of osuFiles) {
    const beatmapString = await osuFile.async("string");
    _data = decoder.decodeFromString(beatmapString);
    if (_data.metadata.beatmapId == mapId) {
      data = _data;
      break;
    }
  }

  if (!data) {
    console.error(
      "No .osu files matching mapId found in archive, choosing last one"
    );
    data = _data!;
  }

  const audioFile = zip.file(data.general.audioFilename);
  if (!audioFile) {
    throw new Error("Audo file not found in archive");
  }

  const audioData = await audioFile.async("arraybuffer");

  const backgroundFilename = data.events.background;
  const backgroundUrl =
    backgroundFilename && (await blobUrlFromFile(zip.file(backgroundFilename)));

  const videoFilename = data.events.video;
  const videoUrl =
    videoFilename && (await blobUrlFromFile(zip.file(videoFilename)));

  return {
    data,
    audioData,
    backgroundUrl,
    videoUrl,
  };
}
