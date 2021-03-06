import JSZip from "jszip";
import { BeatmapDecoder } from "osu-parsers-web";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { executeSteps, LoadCallback } from "../loader";
import fetchProgress from "fetch-progress";
import md5 from "blueimp-md5";
import { StandardBeatmap, StandardRuleset } from "osu-standard-stable";
import { BaseTexture, ImageResource, Texture } from "pixi.js";
import { getAllFramePaths } from "../constants";
import { loadStoryboard, Storyboard } from "osu-storyboard-parser";
import { generateSpriteSheet } from "../spritesheet";

const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
  corePath: "/assets/ffmpeg-core/ffmpeg-core.js",
});

// CORS Blocked
// const getBeatmapRequest = (setId: number) =>
//   new Request(`https://osu.ppy.sh/beatmapsets/${setId}/download`);

function getFileWinCompat(zip: JSZip, path: string): JSZip.JSZipObject | null {
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

const ALL_LAYERS = [
  "Background",
  "Fail",
  "Pass",
  "Foreground",
  "Overlay",
] as const;

export interface LoadedBeatmap {
  data: StandardBeatmap;
  storyboard: Storyboard;
  storyboardResources: Map<string, Texture>;
  audioData: ArrayBuffer;
  background?: Texture;
  videoUrl?: string;
  zip: JSZip;
}

function decodeBeatmap(beatmapString: string): StandardBeatmap {
  const beatmapDecoded = new BeatmapDecoder().decodeFromString(
    beatmapString,
    false
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

          let osuString: string;
          for (const osuFile of osuFiles) {
            osuString = await osuFile.async("string");
            const md5Hash = md5(osuString);
            if (md5Hash == info.checksum) {
              console.log("Found OSU file with checksum", md5Hash);
              loaded.data = decodeBeatmap(osuString);
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
            osuString = await response.text();
            loaded.data = decodeBeatmap(osuString);
          }

          const osbFile: JSZip.JSZipObject | null = loaded.zip!.filter((path) =>
            path.endsWith(".osb")
          )[0];
          const osbString = await osbFile?.async("string");
          const storyboard = loadStoryboard(osuString!, osbString);
          if (storyboard) {
            loaded.storyboard = storyboard;
          }
        },
      },
      {
        weight: 3,
        async execute(cb) {
          if (!loaded.storyboard) {
            return;
          }

          cb(0, "Loading Storyboard Images");

          const allObjects = ALL_LAYERS.flatMap(
            (layer) => loaded.storyboard![layer]
          );

          const allImagePaths = new Set(
            allObjects.flatMap((object) => {
              if (object.type === "Animation") {
                return getAllFramePaths(object);
              } else if (object.type === "Sprite") {
                return object.filepath;
              } else {
                console.warn("Unknown object type", object);
                return [];
              }
            })
          );

          const blobMap = new Map<string, Blob>();
          for (const imagePath of allImagePaths) {
            const file = getFileWinCompat(loaded.zip!, imagePath);
            if (file) {
              blobMap.set(imagePath, await file.async("blob"));
            } else {
              console.warn(`File "${imagePath}" not found in osz`);
            }
          }
          loaded.storyboardResources = await generateSpriteSheet(blobMap);

          // let loadedCount = 0;
          // for (const imagePath of allImagePaths) {
          //   cb(
          //     loadedCount / allImagePaths.size,
          //     `Loading Storyboard Images (${loadedCount + 1}/${
          //       allImagePaths.size + 1
          //     })`
          //   );
          //   loadedCount++;

          //   const texture = await textureFromFile(loaded.zip!, imagePath);

          //   if (texture) {
          //     loaded.storyboardResources!.set(imagePath, texture);
          //   }
          // }
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
            const videoFile = getFileWinCompat(loaded.zip!, videoFilename);
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
