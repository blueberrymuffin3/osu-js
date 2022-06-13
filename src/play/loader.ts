import { Application } from "pixi.js";
import { preloadFonts } from "./resources/fonts";
import { preloadSounds } from "./resources/sounds";
import { preloadTextures } from "./resources/textures";

export type LoadCallback = (prop: number, desc: string) => void;
interface Step {
  weight: number;
  execute: (callback: LoadCallback) => Promise<void>;
}

export async function executeSteps(
  callback: LoadCallback,
  steps: Step[]
): Promise<void> {
  const totalWeight = steps
    .map((step) => step.weight)
    .reduce((a, b) => a + b, 0);

  let progress = 0;

  for (const step of steps) {
    let localCallback: LoadCallback = function (prop, desc) {
      callback(progress + prop * (step.weight / totalWeight), desc);
    };
    await step.execute(localCallback);
    progress += step.weight / totalWeight;
  }
}

export const loadResources =
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
