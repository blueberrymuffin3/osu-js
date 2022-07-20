import JSZip from "jszip";
import { BeatmapDecoder, StoryboardDecoder } from "osu-parsers-web";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { executeSteps, LoadCallback } from "../loader";
import fetchProgress from "fetch-progress";
import md5 from "blueimp-md5";
import { StandardBeatmap, StandardRuleset } from "osu-standard-stable";
import { Storyboard, StoryboardAnimation, StoryboardSprite } from "osu-classes";
import { BaseTexture, ImageResource, Texture } from "pixi.js";
import { getAllFramePaths } from "../constants";

const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
  corePath: "/assets/ffmpeg-core/ffmpeg-core.js",
});

// CORS Blocked
// const getBeatmapRequest = (setId: number) =>
//   new Request(`https://osu.ppy.sh/beatmapsets/${setId}/download`);

function getFileWinCompat(
  zip: JSZip,
  path: string
): JSZip.JSZipObject | null {
  path = path.replaceAll("\\", "/");

  const file = zip.file(path);
  if (file) {
    return file; // Exact match
  }

  const files = zip.filter(
    (candidatePath) => candidatePath.toLowerCase() == path.toLowerCase()
  );
  if (files.length > 0) {
    if (files.length > 1) {
      console.warn(
        "Multiple candidates for case-insensitive search, no exact matches",
        path,
        files
      );
    }
    console.log(`Fuzzy match: "${files[0].name}" for "${path}"`);
    return files[0];
  }

  return null;
}

async function blobUrlFromFile(file: JSZip.JSZipObject | null) {
  if (!file) return undefined;
  const blob = await file.async("blob");
  return URL.createObjectURL(blob);
}

async function textureFromFile(
  zip: JSZip,
  path: string
): Promise<Texture | undefined> {
  const file = getFileWinCompat(zip, path);
  if (!file) {
    console.warn(`Image "${path}" not found in osz archive`);
    return undefined;
  }

  const blob = await file.async("blob");
  const imageResource = new ImageResource(URL.createObjectURL(blob));
  await imageResource.load();
  return new Texture(new BaseTexture(imageResource));
}

const ALL_LAYERS: ["background", "fail", "pass", "foreground", "overlay"] = [
  "background",
  "fail",
  "pass",
  "foreground",
  "overlay",
];

export interface LoadedBeatmap {
  data: StandardBeatmap;
  storyboardResources: Map<string, Texture>;
  audioData: ArrayBuffer;
  background?: Texture;
  videoUrl?: string;
  zip: JSZip;
}

function decodeBeatmap(beatmapString: string): StandardBeatmap {
  const beatmapDecoded = new BeatmapDecoder().decodeFromString(
    beatmapString,
    true
  );

  if (beatmapDecoded.mode !== 0) {
    throw new Error(
      "Beatmaps with game modes other that osu!standard (0) are not yet supported"
    );
  }
  return new StandardRuleset().applyToBeatmap(beatmapDecoded);
}

export const loadBeatmapStep =
  (
    info: BeatmapInfo,
    setLoadedBeatmap: (loadedBeatmap: LoadedBeatmap) => void
  ) =>
  async (cb: LoadCallback) => {
    const loaded: Partial<LoadedBeatmap> = {
      zip: new JSZip(),
      storyboardResources: new Map(),
    };
    let blob: Blob;

    await executeSteps(cb, [
      {
        weight: 10,
        async execute(cb) {
          cb(0, "Downloading Beatmap");

          const interceptor = fetchProgress({
            onProgress(progress) {
              if (progress.total) {
                const prop = progress.transferred / progress.total;
                cb(prop, `Downloading Beatmap (${(prop * 100).toFixed(0)}%)`);
              }
            },
          });
          let response = await interceptor(
            await fetch(`/api/download/beatmapset/${info.beatmapset_id}`)
          );

          if (!response.ok) {
            throw new Error(
              `Error downloading beatmap: Got status ${response.status}`
            );
          } else {
            blob = await response.blob();
          }
        },
      },
      {
        weight: 1,
        async execute(cb) {
          cb(0, "Processing Beatmap");

          await loaded.zip!.loadAsync(blob!);

          const osuFiles = loaded.zip!.filter((path) => path.endsWith(".osu"));

          for (const osuFile of osuFiles) {
            const beatmapString = await osuFile.async("string");
            const md5Hash = md5(beatmapString);
            if (md5Hash == info.checksum) {
              console.log("Found OSU file with checksum", md5Hash);
              loaded.data = decodeBeatmap(beatmapString);
              break;
            }
          }

          if (!loaded.data) {
            cb(0.5, "Downloading latest beatmap version");
            console.warn(
              "No .osu files matching MD5 Hash found, fetching from API instead"
            );
            const response = await fetch(`/api/download/beatmap/${info.id}`);
            if (!response.ok) {
              throw new Error(
                `Error downloading beatmap: Got status ${response.status}`
              );
            }
            loaded.data = decodeBeatmap(await response.text());
          }

          const osbFiles = loaded.zip!.filter((path) => path.endsWith(".osb"));
          for (const osbFile of osbFiles) {
            const storyboardString = await osbFile.async("string");
            const storyboard = new StoryboardDecoder().decodeFromString(
              storyboardString
            );

            if (!loaded.data.events.storyboard) {
              loaded.data.events.storyboard = new Storyboard();
            }

            for (const layer of ALL_LAYERS) {
              loaded.data.events.storyboard![layer] = [
                ...loaded.data.events.storyboard![layer],
                ...storyboard[layer],
              ];
            }
          }
        },
      },
      {
        weight: 3,
        async execute(cb) {
          if (!loaded.data!.events.storyboard) {
            return;
          }

          cb(0, "Loading Storyboard Images");

          const allElements = ALL_LAYERS.flatMap(
            (layer) => loaded.data!.events.storyboard![layer]
          );

          const allImagePaths = new Set(
            allElements.flatMap((element) => {
              if (element instanceof StoryboardAnimation) {
                return getAllFramePaths(element);
              } else if (element instanceof StoryboardSprite) {
                return element.filePath;
              } else {
                console.warn("Unknown element type", element);
                return [];
              }
            })
          );

          let loadedCount = 0;
          for (const imagePath of allImagePaths) {
            cb(
              loadedCount / allImagePaths.size,
              `Loading Storyboard Images (${loadedCount + 1}/${
                allImagePaths.size + 1
              })`
            );
            loadedCount++;

            const texture = await textureFromFile(loaded.zip!, imagePath);

            if (texture) {
              loaded.storyboardResources!.set(imagePath, texture);
            }
          }
        },
      },
      {
        weight: 3,
        async execute(cb) {
          cb(0, "Loading Media");

          if (!loaded.data) {
            throw new Error("!data");
          }

          const audioFile = getFileWinCompat(
            loaded.zip!,
            loaded.data.general.audioFilename
          );
          if (!audioFile) {
            throw new Error("Audio file not found in archive");
          }

          loaded.audioData = await audioFile.async("arraybuffer");

          const backgroundFilename = loaded.data.events.background;
          if (backgroundFilename) {
            loaded.background = await textureFromFile(
              loaded.zip!,
              backgroundFilename
            );
          }

          const videoFilename = loaded.data.events.video;
          if (videoFilename) {
            const videoFile = getFileWinCompat(
              loaded.zip!,
              videoFilename
            );
            if (!videoFile) {
              console.error(`Video file "${videoFile}" not found in archive`);
            } else if (videoFilename.endsWith(".mp4")) {
              console.log(`Using original "${videoFilename}"`);
              loaded.videoUrl = await blobUrlFromFile(videoFile);
            } else {
              console.log(`Remuxing "${videoFilename}" with FFmpeg`);
              cb(0, "Remuxing Video (initializing)");
              await ffmpeg.load();
              const ffmpegInputFilename = "input_" + videoFile.name;

              ffmpeg.FS(
                "writeFile",
                ffmpegInputFilename,
                await videoFile.async("uint8array")
              );
              try {
                ffmpeg.setProgress(({ ratio }) =>
                  cb(ratio, `Remuxing Video (${(ratio * 100).toFixed(0)}%)`)
                );
                await ffmpeg.run(
                  "-fflags",
                  "+genpts+nofillin+ignidx",
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
                loaded.videoUrl = URL.createObjectURL(
                  new Blob([output], {
                    type: "video/mp4",
                  })
                );
                try {
                  ffmpeg.exit();
                } catch (error) {
                  console.warn(error);
                }
              } catch (e) {
                console.error("Error remuxing video", e);
                loaded.videoUrl = undefined;
              }
            }
          }
        },
      },
    ]);

    setLoadedBeatmap(loaded as LoadedBeatmap);
  };
