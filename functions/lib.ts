const GRACE_PERIOD = 30;

export interface ENV {
  OSU_CLIENT_ID: string;
  OSU_CLIENT_SECRET: string;
}

interface TokenRequestData {
  client_id: number;
  client_secret: string;
  grant_type: "client_credentials";
  scope: "public";
}

interface TokenResponseData {
  token_type: string;
  expires_in: number;
  access_token: string;
}

let currentApiToken: string = "";
let currentApiTokenExpires: number = 0;

export async function getAPITokenHeader(env: ENV): Promise<HeadersInit> {
  if (currentApiTokenExpires <= new Date().getTime()) {
    console.log("Getting a new API token");
    if (!env.OSU_CLIENT_ID || !env.OSU_CLIENT_ID) {
      throw new Error("Environment variables are missing");
    }
    const requestData: TokenRequestData = {
      client_id: Number(env.OSU_CLIENT_ID),
      client_secret: env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    };

    const response = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Error refreshing token: Got status ${response.status}`);
    }

    const responseData = (await response.json()) as TokenResponseData;
    currentApiToken = responseData.access_token;

    currentApiTokenExpires =
      new Date().getTime() + (responseData.expires_in - GRACE_PERIOD) * 1000;
  }

  return {
    Authorization: `Bearer ${currentApiToken}`,
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}

export async function cachedApiResponseHelper(
  originUrls: string | string[],
  {
    waitUntil,
    ttl,
    fetchHeaders,
    cacheKey,
    magicBytes,
  }: {
    waitUntil: (promise: Promise<any>) => void;
    ttl: number;
    fetchHeaders?: HeadersInit | undefined;
    cacheKey?: string | undefined;
    magicBytes?: Uint8Array | undefined;
  }
): Promise<Response> {
  const cacheHeaders = {
    "Cache-Control": `max-age=${ttl}`,
  };

  if (typeof originUrls === "string") {
    originUrls = [originUrls];
  }

  if (originUrls.length > 1 && !cacheKey) {
    throw new Error("Cache key required with redundant origins");
  }

  if (!cacheKey) {
    cacheKey = originUrls[0];
  }

  const cache = await caches.open("api-cache");
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    console.log(`[HIT] ${cacheKey}`);
    return cachedResponse;
  } else {
    console.log(`[MISS] ${cacheKey}`);
  }

  requestLoop: for (const originUrl of shuffleArray(originUrls)) {
    try {
      const res = await fetch(originUrl, { headers: fetchHeaders });

      if (res.status == 200) {
        const blob = await res.blob();

        if (magicBytes) {
          if (blob.size < magicBytes.length) {
            console.warn(
              `Error fetching "${originUrl}": not enough magic bytes`
            );
          }

          const sample = new DataView(await blob.arrayBuffer());
          for (let i = 0; i < magicBytes.length; i++) {
            if (sample.getUint8(i) !== magicBytes[i]) {
              console.warn(
                `Error fetching "${originUrl}": magic bytes invalid`
              );

              continue requestLoop;
            }
          }
        }

        const response = new Response(blob, {
          headers: cacheHeaders,
        });

        console.log(`Fetched "${originUrl}"`);

        // cache.put respects Cache-Control in cloudflare workers
        waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } else {
        console.warn(`Error fetching "${originUrl}": got code ${res.status}`);
        continue;
      }
    } catch (error) {
      console.error(`Error fetching "${originUrl}": error caught`);
      console.error(error);
    }
  }

  return new Response("Bad Gateway", {
    status: 502,
  });
}
