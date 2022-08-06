
export type LoadCallback = (prop: number, desc: string) => void;
export interface LoadStep {
  weight: number;
  execute: (callback: LoadCallback) => Promise<void>;
}

export async function executeSteps(
  callback: LoadCallback,
  steps: LoadStep[]
): Promise<void> {
  const totalWeight = steps
    .map((step) => step.weight)
    .reduce((a, b) => a + b, 0);

  let progress = 0;
  let _activeStep: any;

  for (const step of steps) {
    _activeStep = step;
    let localCallback: LoadCallback = function (prop, desc) {
      if (step === _activeStep) {
        callback(progress + prop * (step.weight / totalWeight), desc);
      } else {
        // promise already resolved, ignore callback
      }
    };
    await step.execute(localCallback);
    progress += step.weight / totalWeight;
  }
}

