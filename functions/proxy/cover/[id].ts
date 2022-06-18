import { cachedApiResponseHelper } from "../../lib";

export const onRequestGet: PagesFunction = async ({ params, waitUntil }) => {
  return cachedApiResponseHelper(
    `https://assets.ppy.sh/beatmaps/${Number(params.id)}/covers/card@2x.jpg`,
    {
      waitUntil,
      ttl: 3600,
    }
  );
};
