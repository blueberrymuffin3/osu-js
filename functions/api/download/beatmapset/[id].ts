import { cachedApiResponseHelper } from "../../../lib";

const magicBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

export const onRequestGet: PagesFunction = async ({ params, waitUntil }) => {
  const id = Number(params.id);

  if (isNaN(id) || id <= 0) {
    return new Response("Bad Request", { status: 400 });
  }

  return cachedApiResponseHelper(
    [
      `https://kitsu.moe/api/d/${id}`,
      `https://beatconnect.io/b/${id}/`,
      `https://chimu.moe/d/${id}`,
      `https://catboy.best/d/${id}`,
      `https://proxy.nerinyan.moe/d/${id}`,
    ],
    {
      waitUntil,
      ttl: 3600,
      cacheKey: `cache:download-beatmapset/${id}`,
      magicBytes,
    }
  );
};
