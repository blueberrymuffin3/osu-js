import JSZip from "jszip";
import { Storyboard, StoryboardAnimation, StoryboardSprite } from "osu-classes";
import { BeatmapDecoder, StoryboardDecoder } from "osu-parsers";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { executeSteps, LoadCallback } from "../loader";
import fetchProgress from "fetch-progress";
import md5 from "blueimp-md5";
import { StandardBeatmap, StandardRuleset } from "osu-standard-stable";
import { BaseTexture, ImageResource, Texture } from "pixi.js";
import { getAllFramePaths } from "../constants";
import { generateAtlases } from "../sprite_atlas";

const BEATMAP_CACHE_TTL = 3600;
const CACHE_HEADER_TIMESTAMP = "x-cache-timestamp";

const ffmpeg = createFFmpeg({
  logger: ({ type, message }) => console.debug(`[${type}]`, message),
  corePath: "/assets/ffmpeg-core/ffmpeg-core.js",
});

// CORS Blocked
// const getBeatmapRequest = (setId: number) =>
//   new Request(`https://osu.ppy.sh/beatmapsets/${setId}/download`);

function getFileWinCompat(zip: JSZip, path: string): JSZip.JSZipObject | null {
  path = path.replaceAll(/\\+/g, "/");

  const file = zip.file(path);
  if (file) {
    return file; // Exact match
  }

  const files = zip.filter((candidatePath) => {
    candidatePath = candidatePath.toLocaleLowerCase();
    let query = path.toLowerCase();
    if (candidatePath == query) {
      return true; // case-insensitive
    }

    query = query + ".";
    if (
      candidatePath.startsWith(query) &&
      candidatePath.lastIndexOf(".") == query.length - 1
    ) {
      return true; // file extension omitted
    }

    return false;
  });
  if (files.length > 0) {
    if (files.length > 1) {
      console.warn(
        "Multiple candidates for fuzzy search, no exact matches",
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
  videoURLs: Map<string, string | null>;
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

async function loadVideo(
  videoFilename: string, 
  zip: JSZip,
  cb: LoadCallback,
): Promise<string | null> {
  const videoFile = getFileWinCompat(zip, videoFilename);

  if (!videoFile) {
    console.error(
      `Video file "${videoFilename}" not found in archive`
    );

    return null;
  }
  
  if (videoFilename.endsWith(".mp4")) {
    console.log(`Using original "${videoFilename}"`);
    return (await blobUrlFromFile(videoFile)) ?? null;
  } 

  console.log(`Remuxing "${videoFilename}" with FFmpeg`);
  cb(0, "Remuxing Video (initializing)");
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
        weight: 8,
        async execute(cb) {
          cb(0, "Downloading Beatmap");

          const url = `/api/download/beatmapset/${info.beatmapset_id}`;
          let cache: Cache | null = null;
          try {
            cache = await caches.open("cache");
            const cachedRes = await cache.match(url);

            if (cachedRes) {
              console.log(cachedRes);
              const timestamp = cachedRes.headers.get(CACHE_HEADER_TIMESTAMP);
              const age = (Date.now() - Number(timestamp)) / 1000;
              if (!timestamp || age > BEATMAP_CACHE_TTL) {
                //prettier-ignore
                console.log(`Purging stale cache entry for "${url}" (Age: ${age.toFixed(0)}s)`);
                // TODO: Also purge cache entries for other beatmapsets
                await cache.delete(url);
              } else {
                //prettier-ignore
                console.log(`Using cached beatmapset from "${url}" (Age: ${age.toFixed(0)}s)`);
                blob = await cachedRes.blob();
                return;
              }
            }
          } catch (error) {
            console.error("Error getting beatmapset from cache", error);
          }

          const interceptor = fetchProgress({
            onProgress(progress) {
              const speed = `${(progress.speed / 1048576).toFixed(2)} MiB/s`;
              if (progress.total) {
                const prop = progress.transferred / progress.total;
                //prettier-ignore
                cb(prop, `Downloading Beatmap (${(prop * 100).toFixed(0)}%, ${speed})`);
              } else {
                cb(0.5, `Downloading Beatmap (${speed})`);
              }
            },
          });
          let response = await interceptor(await fetch(url));

          if (!response.ok) {
            throw new Error(
              `Error downloading beatmap: Got status ${response.status}`
            );
          } else {
            blob = await response.blob();

            const headers = new Headers();
            headers.set(CACHE_HEADER_TIMESTAMP, Date.now().toString());
            try {
              await cache?.put(
                new Request(url),
                new Response(blob, { headers })
              );
            } catch (error) {
              console.error("Error saving beatmapset to cache", error);
            }
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

          const osbFiles = loaded.zip!.filter((path) => path.endsWith(".osb"));
          if (osbFiles.length > 1) {
            console.warn(
              `${osbFiles.length} osb files found in archive, choosing "${osbFiles[0].name}"`
            );
          }
          const osbString = await osbFiles[0]?.async("string");
          loaded.storyboard = new StoryboardDecoder().decodeFromString(
            osuString!,
            osbString
          );

          loaded.data.events.storyboard = loaded.storyboard;
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
            (layer) => loaded.storyboard!.getLayerByName(layer).elements
          );

          const allImagePaths = new Set(
            allObjects.flatMap((object) => {
              if (object instanceof StoryboardAnimation) {
                return getAllFramePaths(object);
              }

              if (object instanceof StoryboardSprite) {
                return object.filePath;
              }

              console.warn("Unknown object type", object);
              return [];
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
          loaded.storyboardResources = await generateAtlases(blobMap, cb);

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

          const videoLayer = loaded.storyboard!.getLayerByName('Video');
          const videoFilenames = videoLayer.elements.map((e) => e.filePath);

          if (!videoFilenames.length) return;
  
          if (!window.SharedArrayBuffer) {
            console.warn("Ignoring video, SharedArrayBuffer is undefined");
            return;
          }

          loaded.videoURLs ??= new Map();

          await ffmpeg.load();
          
          for (const filename of videoFilenames) {
            const url = await loadVideo(filename, loaded.zip!, cb);

            loaded.videoURLs!.set(filename, url);
          }

          try {
            ffmpeg.exit();
          } catch (error) {
            console.warn(error);
          }
        },
      },
    ]);

    setLoadedBeatmap(loaded as LoadedBeatmap);
  };
