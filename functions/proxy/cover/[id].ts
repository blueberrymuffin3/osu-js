import { cacheHeaders } from "../../lib";

export const onRequestGet: PagesFunction = async ({ params, env }) => {
  const id = Number.parseInt(params.id as string);

  const response = await fetch(
    `https://assets.ppy.sh/beatmaps/${id}/covers/card@2x.jpg`
  );

  if (response.ok) {
    return new Response(response.body, {
      headers: {
        ...cacheHeaders,
        "Content-Type": response.headers.get("Content-Type"),
      },
    });
  } else if (response.status == 404) {
    return new Response("Beatmap Not Found", { status: 404 });
  } else {
    return new Response(`Error fetching beatmap: got code ${response.status}`, {
      status: 500,
    });
  }
};
