import JSZip from "jszip";
import { BeatmapDecoder } from "osu-parsers-web";
import { Beatmap } from "osu-classes";
import { createFFmpeg } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
});

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
  let cache: Cache | null = null;

  try {
    cache = await _cache;
  } catch (error) {}

  const request = getBeatmapRequest(setId);

  let response: Response | undefined;

  if (cache) {
    response = await cache.match(request);
    if (!response) {
      await cache.add(request);
      response = await cache.match(request);
    }
  }

  if (!response) {
    console.warn("Error fetching using cache API, falling back to fetch");

    response = await fetch(request);
  }


  if(response && response.headers.get('content-type') && response.headers.get('content-type')!.indexOf("json") >= 0){
    let error = await response.text()
    await cache?.delete(request);
    response = undefined;
    throw new Error("Error fetching beatmap: " + error);
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
      console.log("Loading", osuFile.name);
      data = _data;
      break;
    }
  }

  if (!data) {
    console.warn(
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
  let videoUrl: string | undefined = undefined;
  if (videoFilename) {
    // if (videoFilename?.endsWith(".mp4")) {
    //   videoUrl =
    //     videoFilename && (await blobUrlFromFile(zip.file(videoFilename)));
    // } else {
    console.warn(`Attempting to remux "${videoFilename}" with FFmpeg`);
    const videoFile = zip.file(videoFilename);
    if (!videoFile) {
      console.error(`Video file "${videoFile}" not found in archivbe`);
    } else {
      await ffmpeg.load();
      const ffmpegInputFilename = "input_" + videoFile.name;

      ffmpeg.FS(
        "writeFile",
        ffmpegInputFilename,
        await videoFile.async("uint8array")
      );
      try {
        console.group("ffmpeg output");
        ffmpeg.setProgress(({ ratio }) => console.log("Progress:", ratio));
        await ffmpeg.run(
          "-fflags",
          "+genpts+igndts",
          // "-loglevel",
          // "error",
          "-i",
          ffmpegInputFilename,
          "-vcodec",
          "copy",
          "-an",
          "output.mp4"
        );
        console.groupEnd();

        const output = ffmpeg.FS("readFile", "output.mp4");
        // ffmpeg.FS("unlink", "output.mp4");
        videoUrl = URL.createObjectURL(new Blob([output]));
        console.log(videoUrl);
        ffmpeg.exit();
      } catch (e) {
        console.error("Error remuxing video", e);
        videoUrl = undefined;
      }
    }
    // }
  }

  return {
    data,
    audioData,
    backgroundUrl,
    videoUrl,
  };
}
