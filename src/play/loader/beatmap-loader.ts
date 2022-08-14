import JSZip from "jszip";
import {
  StoryboardAnimation,
  StoryboardSample,
  StoryboardSprite,
} from "osu-classes";
import { BeatmapDecoder, StoryboardDecoder } from "osu-parsers";
import { Beatmap as BeatmapInfo } from "osu-api-v2";
import { executeSteps, LoadCallback } from "./executor";
import fetchProgress from "fetch-progress";
import md5 from "blueimp-md5";
import { StandardBeatmap, StandardRuleset } from "osu-standard-stable";
import { getAllFramePaths } from "../constants";
import { generateAtlases } from "./atlas-loader";
import { loadSamples } from "./sample-loader";
import { loadVideosStep } from "./video-loader";
import {
  blobUrlFromFile,
  getBlobMappings,
  getFileWinCompat,
  LoadedBeatmap,
  loadSound,
  textureFromFile,
} from "./util";

const BEATMAP_CACHE_TTL = 3600;
const CACHE_HEADER_TIMESTAMP = "x-cache-timestamp";

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

          cb(0, "Loading Storyboard Images & Samples");

          const allLayers = [...loaded.storyboard.layers.values()];
          const visibleLayers = allLayers.filter((l) => l.visibleWhenPassing);
          const allObjects = visibleLayers.flatMap((l) => l.elements);

          const allImagePaths = new Set<string>();
          const allSamplePaths = new Set<string>();

          for (let i = 0; i < allObjects.length; ++i) {
            const object = allObjects[i];

            if (object instanceof StoryboardAnimation) {
              getAllFramePaths(object).forEach((p) => allImagePaths.add(p));
              continue;
            }

            if (object instanceof StoryboardSprite) {
              allImagePaths.add(object.filePath);
              continue;
            }

            if (object instanceof StoryboardSample) {
              allSamplePaths.add(object.filePath);
              continue;
            }

            console.warn("Unknown object type", object);
          }

          const imageBlobs = await getBlobMappings(loaded.zip!, allImagePaths);
          const sampleBlobs = await getBlobMappings(
            loaded.zip!,
            allSamplePaths
          );

          await executeSteps(cb, [
            {
              weight: 5,
              async execute(cb) {
                loaded.storyboardImages = await generateAtlases(imageBlobs, cb);
              },
            },
            {
              weight: 1,
              async execute(cb) {
                loaded.storyboardSamples = await loadSamples(sampleBlobs, cb);
              },
            },
          ]);
        },
      },
      {
        weight: 0.25,
        async execute(cb) {
          cb(0, "Loading Audio");

          const audioFile = getFileWinCompat(
            loaded.zip!,
            loaded.data!.general.audioFilename
          );
          if (!audioFile) {
            throw new Error("Audio file not found in archive");
          }

          loaded.audio = await loadSound({
            src: (await blobUrlFromFile(audioFile)) as string,
            html5: true,
            preload: "metadata",
            format: audioFile.name.substring(
              audioFile.name.lastIndexOf(".") + 1
            ),
          });
        },
      },
      {
        weight: 0.25,
        async execute(cb) {
          cb(0, "Loading Background");

          const backgroundFilename = loaded.data!.events.backgroundPath;
          if (backgroundFilename) {
            loaded.background = await textureFromFile(
              loaded.zip!,
              backgroundFilename
            );
          }
        },
      },
      {
        weight: 2,
        execute: loadVideosStep(loaded),
      },
    ]);

    setLoadedBeatmap(loaded as LoadedBeatmap);
  };
