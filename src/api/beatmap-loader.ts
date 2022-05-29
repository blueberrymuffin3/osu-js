import JSZip from "jszip";
import { BeatmapDecoder } from "osu-parsers-web";
import { Beatmap } from "osu-classes";
import { ILoaderPlugin, LoaderResource } from "pixi.js";

export interface LoadedBeatmap {
  data: Beatmap;
  audioData: ArrayBuffer;
}

export const loadedBeatmaps = new Map<string, LoadedBeatmap>();

export class BeatmapLoader implements ILoaderPlugin {
  static async pre(resource: LoaderResource, next: (...args: any[]) => void) {
    if (resource.extension != "osz") {
      next();
      return;
    }

    resource.xhrType = LoaderResource.XHR_RESPONSE_TYPE.BLOB;
    next();
  }

  static async use(resource: LoaderResource, next: (...args: any[]) => void) {
    if (resource.extension != "osz") {
      next();
      return;
    }

    const zip = new JSZip();
    await zip.loadAsync(resource.data as Blob);

    const osuFile = zip.filter((path) => path.endsWith(".osu"))[0];
    if (!osuFile) {
      next();
      console.error("No .osu file found in archive");
      return;
    }

    const beatmapString = await osuFile.async("string");
    const decoder = new BeatmapDecoder();
    const data = decoder.decodeFromString(beatmapString);

    const audioFile = zip.file(data.general.audioFilename);
    if (!audioFile) {
      next();
      console.error("Audo file not found in archive");
      return;
    }

    const audioData = await audioFile.async("arraybuffer");

    loadedBeatmaps.set(resource.name, {
      data,
      audioData,
    });
    next();
  }
}
