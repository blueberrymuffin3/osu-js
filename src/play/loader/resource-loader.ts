import { Application } from "pixi.js";
import { preloadFonts } from "../resources/fonts";
import { preloadSounds } from "../resources/sounds";
import { preloadTextures } from "../resources/textures";
import { LoadCallback } from "./executor";

export const loadResourcesStep =
  (app: Application) =>
  (cb: LoadCallback): Promise<void> => {
    app.loader.add(preloadTextures);
    app.loader.add(preloadSounds);
    app.loader.add(preloadFonts);

    const loadedPromise = new Promise<void>((resolve, reject) => {
      app.loader.onError.add((error) => reject(error));
      app.loader.load(() => resolve());
    });

    cb(0, "Loading resources");
    app.loader.onProgress.add(() =>
      cb(
        app.loader.progress / 100,
        `Loading resources (${app.loader.progress.toFixed(0)}%)`
      )
    );

    return loadedPromise;
  };
