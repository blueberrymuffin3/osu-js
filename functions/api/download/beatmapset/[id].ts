import { cachedApiResponseHelper } from "../../../lib";

export const onRequestGet: PagesFunction = async ({ params, waitUntil }) =>
  cachedApiResponseHelper(
    // `https://beatconnect.io/b/${Number(params.id)}/`,
    `https://kitsu.moe/api/d/${Number(params.id)}`,
    {
      waitUntil,
      ttl: 3600,
    }
  );
