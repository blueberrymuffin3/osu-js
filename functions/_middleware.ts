export const onRequest: PagesFunction = async ({ next }) => {
  const originalResponse = await next();
  const response = new Response(originalResponse.body, originalResponse)
  response.headers.append("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.append("Cross-Origin-Embedder-Policy", "require-corp");

  return response;
};
