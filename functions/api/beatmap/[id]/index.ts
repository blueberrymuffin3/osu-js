import { cacheHeaders, ENV, getAPITokenHeader } from "../../../lib";

export const onRequestGet: PagesFunction<ENV> = async ({ params, env }) => {
  const headers = await getAPITokenHeader(env);

  const url = new URL("https://osu.ppy.sh/api/v2/beatmaps/lookup");
  url.searchParams.append("id", params.id as string);

  const response = await fetch(url.toString(), { headers });

  if (response.ok) {
    return new Response(response.body, {
      headers: {
        ...cacheHeaders,
        "Content-Type": "application/json",
      },
    });
  } else if (response.status == 404) {
    return new Response("Beatmap Not Found", { status: 404 });
  } else {
    return new Response(`Error fetching beatmap: got code ${response.status}`, { status: 500 });
  }
};
