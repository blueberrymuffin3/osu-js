import { cachedApiResponseHelper, ENV, getAPITokenHeader } from "../../../lib";

export const onRequestGet: PagesFunction<ENV> = async ({
  waitUntil,
  params,
  env,
}) => {
  const url = new URL("https://osu.ppy.sh/api/v2/beatmaps/lookup");
  url.searchParams.append("id", params.id as string);

  return cachedApiResponseHelper(url.toString(), {
    waitUntil,
    ttl: 60,
    fetchHeaders: await getAPITokenHeader(env),
  });
};
