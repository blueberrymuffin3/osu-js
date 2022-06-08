export const onRequestGet: PagesFunction = ({ params }) => {
  return fetch(`https://beatconnect.io/b/${params.id}/`);
  // return fetch(`https://kitsu.moe/api/d/${params.id}`); // No Video
};
