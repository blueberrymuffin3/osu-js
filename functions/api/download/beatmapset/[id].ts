export const onRequestGet: PagesFunction = async ({ params }) => {
  const id = Number(params.id);

  if (isNaN(id) || Math.floor(id) !== id || id <= 0) {
    return new Response("Bad Request", { status: 400 });
  }
  const res = await fetch(`https://chimu.moe/d/${id}`);
  if (res.status === 200) {
    return new Response(res.body, {
      headers: {
        "content-length": res.headers.get("content-length"),
        "content-type": "application/x-osu-archive",
      },
    });
  } else if (res.status == 404) {
    return new Response("Not Found", { status: 404 });
  } else {
    return new Response(`Got code ${res.status} from origin`, { status: 500 });
  }
};
