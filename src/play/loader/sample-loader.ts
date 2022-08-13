import { executeSteps, LoadCallback } from "./executor";
import { Howl } from "howler";

export async function loadSamples(
  input: Map<string, Blob>,
  cb: LoadCallback
): Promise<Map<string, Howl>> {
  const samples = new Map<string, Howl>();

  await executeSteps(cb, [
    {
      weight: 1,
      async execute(cb) {
        let decoded = 0;
        for (const [name, blob] of input.entries()) {
          cb(
            decoded / input.size,
            `Loading Samples (${decoded + 1} / ${input.size})`
          );

          const howl = new Howl({
            src: URL.createObjectURL(blob),
            html5: true,
            preload: "metadata",
            format: name.substring(name.lastIndexOf(".") + 1),
          });

          samples.set(name, howl);

          decoded++;
        }
      },
    },
  ]);

  return samples;
}