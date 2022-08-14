import "./style.scss";
import type { Beatmap } from "osu-api-v2";
import Mustache from "mustache";
import templateError from "./main_error.html?raw";
import template from "./main_info.handlebars?raw";
import DEFAULT_BANNER from "./default-banner.jpg";

declare global {
  interface Window {
    onBannerError: (img: HTMLImageElement) => void;
  }
}

(async () => {
  const id = Number(new URL(location.toString()).search.substring(1));
  const infoResponse = await fetch(`/api/beatmap/${id}`);

  if (!infoResponse.ok) {
    document.querySelector<HTMLElement>(".info")!.innerHTML = templateError;
  }

  const info = (await infoResponse.json()) as Beatmap;

  console.log(info);

  document.title = `${info.beatmapset?.artist} - ${info.beatmapset?.title} - ${
    info.version
  } (\u2605 ${info.difficulty_rating.toFixed(2)})`;

  window.onBannerError = (img: HTMLImageElement) => {
    // Prevent load loops
    if (img.src != DEFAULT_BANNER) {
      img.src = DEFAULT_BANNER;
    }
  };

  document.querySelector<HTMLElement>(".info")!.innerHTML = Mustache.render(
    template,
    {
      ...info,
      formatNumber: () => (text: string, render: (s: string) => string) => {
        return new Number(render(text)).toLocaleString();
      },
    }
  );

  const loading = document.getElementById("loading") as HTMLAnchorElement;
  const loadingBar = document.getElementById("loading-bar")!;
  const loadingText = document.getElementById("loading-text")!;

  const updateLoadingBar = (prop: number, desc: string) => {
    loadingBar.style.width = `${prop * 100}%`;
    loadingText.innerText = desc;
  };

  updateLoadingBar(0, "downloading app");
  try {
    const app = await import("./play");
    await app.load(updateLoadingBar, info);

    updateLoadingBar(1, "Start");
    loading.classList.add("loaded");
    loading.href = "#";
    loading.onclick = (e) => {
      e.preventDefault();
      loading.blur();

      document.body.innerHTML = `<div id="container" />`;
      const container = document.getElementById("container") as HTMLElement;
      app.start(container);
    };
  } catch (error) {
    console.error(error);

    loadingBar.style.width = "100%";
    loadingBar.classList.add("error");
    // TODO: Show long error messages without clipping overflow
    loadingText.innerText = `Error loading beatmap: ${error}`;

    return;
  }
})();
