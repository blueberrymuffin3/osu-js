import JSZip from "jszip";
import { Storyboard } from "osu-classes";
import { StandardBeatmap } from "osu-standard-stable";
import { BaseTexture, ImageResource, Texture } from "pixi.js";

export interface LoadedBeatmap {
  data: StandardBeatmap;
  storyboard: Storyboard;
  storyboardResources: Map<string, Texture>;
  audioData: ArrayBuffer;
  background?: Texture;
  videoURLs: Map<string, string | null>;
  zip: JSZip;
}

export function getFileWinCompat(
  zip: JSZip,
  path: string
): JSZip.JSZipObject | null {
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

export async function blobUrlFromFile(file: JSZip.JSZipObject | null) {
  if (!file) return undefined;
  const blob = await file.async("blob");
  return URL.createObjectURL(blob);
}

export async function textureFromFile(
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
