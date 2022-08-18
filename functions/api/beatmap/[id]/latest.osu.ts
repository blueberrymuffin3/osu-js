import { cachedApiResponseHelper } from "../../../lib";

export const onRequestGet: PagesFunction = async ({ params, waitUntil }) =>
  cachedApiResponseHelper(`https://osu.ppy.sh/osu/${Number(params.id)}`, {
    waitUntil,
    ttl: 60,
  });
