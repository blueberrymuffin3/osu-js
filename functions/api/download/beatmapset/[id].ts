import { cacheHeaders } from "../../../lib";

export const onRequestGet: PagesFunction = async ({ params }) => {
  let id: number = Number(params.id as string);
  // const res = await fetch(`https://beatconnect.io/b/${id}/`);
  const res = await fetch(`https://kitsu.moe/api/d/${id}`);
  if (res.status == 200) {
    const contentLength: string | null = res.headers.get("Content-Length");
    if (contentLength === null) {
      // Just in case we get a chunked response
      return new Response(res.body, { headers: cacheHeaders });
    } else {
      let { readable, writable } = new FixedLengthStream(parseInt(contentLength));
      res.body.pipeTo(writable)
      return new Response(readable, { headers: cacheHeaders });
    }
  } else if (res.status == 404) {
    return new Response("No beatmapset found", {
      status: 404,
    });
  } else {
    return new Response(`Error fetching beatmap: got code ${res.status}`, {
      status: 500,
    });
  }
};
