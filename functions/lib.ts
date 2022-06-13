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

export const cacheHeaders = {
  "Cache-Control": "max-age=21600",
};

export async function getAPITokenHeader(env: ENV): Promise<HeadersInit> {
  if (currentApiTokenExpires <= new Date().getTime()) {
    console.log("Getting a new API token");
    if (!env.OSU_CLIENT_ID || !env.OSU_CLIENT_ID) {
      throw new Error("Environment variables are missing");
    }
    const requestData: TokenRequestData = {
      client_id: Number.parseInt(env.OSU_CLIENT_ID),
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
