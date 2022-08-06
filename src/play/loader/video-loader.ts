import { createFFmpeg } from "@ffmpeg/ffmpeg";
import JSZip from "jszip";
import { executeSteps, LoadCallback } from "./executor";
import { blobUrlFromFile, getFileWinCompat, LoadedBeatmap } from "./util";

const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
  corePath: "/assets/ffmpeg-core/ffmpeg-core.js",
});

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

  if (videoFilename.endsWith(".mp4")) {
    console.log(`Using original "${videoFilename}"`);
    return (await blobUrlFromFile(videoFile)) ?? null;
  }

  if (!ffmpeg.isLoaded()) {
    cb(0, "Loading ffmpeg");
    await ffmpeg.load();
  }

  console.log(`Remuxing "${videoFilename}" with FFmpeg`);
  cb(0, "initializing");
  const ffmpegInputFilename = "input_" + videoFile.name;

  ffmpeg.FS(
    "writeFile",
    ffmpegInputFilename,
    await videoFile.async("uint8array")
  );

  try {
    ffmpeg.setProgress(({ ratio }) =>
      cb(ratio, (ratio * 100).toFixed(0) + "%")
    );
    await ffmpeg.run(
      // "-fflags",
      // "+genpts+nofillin+ignidx",
      "-i",
      ffmpegInputFilename,
      "-vcodec",
      "copy",
      "-an",
      "output.mp4"
    );

    ffmpeg.FS("unlink", ffmpegInputFilename);
    const output = ffmpeg.FS("readFile", "output.mp4");
    ffmpeg.FS("unlink", "output.mp4");

    return URL.createObjectURL(
      new Blob([output], {
        type: "video/mp4",
      })
    );
  } catch (e) {
    console.error("Error remuxing video", e);
    return null;
  }
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

    if (ffmpeg.isLoaded()) {
      try {
        ffmpeg.exit();
      } catch (error) {
        console.warn(error);
      }
    }
  };
