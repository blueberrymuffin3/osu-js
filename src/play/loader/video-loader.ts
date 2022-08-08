import { createFFmpeg } from "@ffmpeg/ffmpeg";
import JSZip from "jszip";
import { executeSteps, LoadCallback } from "./executor";
import { blobUrlFromFile, getFileWinCompat, LoadedBeatmap } from "./util";

export const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
  corePath: "/assets/ffmpeg-core/ffmpeg-core.js",
});

let id = 0;

async function loadVideo(
  videoFilename: string,
  zip: JSZip,
  cb: LoadCallback
): Promise<string | null> {
  const videoFile = getFileWinCompat(zip, videoFilename);

  if (!videoFile) {
    console.error(`Video file "${videoFilename}" not found in archive`);

    return null;
  }

  // TODO: Use somthing like mediainfo.js to verify that it's H.264
  if (videoFilename.endsWith(".mp4")) {
    console.log(`Using original "${videoFilename}"`);
    cb(0.5, `Decompressing`);
    return (await blobUrlFromFile(videoFile)) ?? null;
  }

  if (!ffmpeg.isLoaded()) {
    cb(0, "Loading ffmpeg");
    await ffmpeg.load();
  }

  cb(0.5, "Decompressing");
  const ffmpegInputFilename = "input_" + id++;

  ffmpeg.FS(
    "writeFile",
    ffmpegInputFilename,
    await videoFile.async("uint8array")
  );

  console.log(`Copied "${videoFilename}" to "${ffmpegInputFilename}"`);

  return "file:" + ffmpegInputFilename;
}

export const loadVideosStep =
  (loaded: Partial<LoadedBeatmap>) => async (cb: LoadCallback) => {
    const videoLayer = loaded.storyboard!.getLayerByName("Video");
    const videoFilenames = videoLayer.elements.map((e) => e.filePath);

    if (!videoFilenames.length) return;

    loaded.videoURLs = new Map(
      videoFilenames.map((filename) => [filename, null])
    );

    const videoPaths = [...loaded.videoURLs.keys()];

    await executeSteps(
      cb,
      videoPaths.map((filename, i) => ({
        weight: 1,
        async execute(cb) {
          const prefix = `Loading video ${i + 1}/${videoPaths.length}`;
          cb(0, prefix);

          const prefixedCallback: LoadCallback = (prop, desc) =>
            cb(prop, `${prefix} (${desc})`);
          const url = await loadVideo(filename, loaded.zip!, prefixedCallback);

          loaded.videoURLs!.set(filename, url);
        },
      }))
    );
  };
