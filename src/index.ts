export interface Env {
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  KICK_CLIENT_ID: string;
  KICK_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body = (await request.json()) as {
        provider: "twitch" | "kick";
        code: string;
        redirect_uri: string;
        code_verifier?: string; // Optional for PKCE flows
      };

      const { provider, code, redirect_uri, code_verifier } = body;

      if (!provider || !code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let tokenEndpoint = "";
      let params = new URLSearchParams();

      if (provider === "twitch") {
        tokenEndpoint = "https://id.twitch.tv/oauth2/token";
        params.append("client_id", env.TWITCH_CLIENT_ID);
        params.append("client_secret", env.TWITCH_CLIENT_SECRET);
        params.append("code", code);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", redirect_uri);
      } else if (provider === "kick") {
        tokenEndpoint = "https://id.kick.com/oauth/token";
        params.append("client_id", env.KICK_CLIENT_ID);
        params.append("client_secret", env.KICK_CLIENT_SECRET);
        params.append("code", code);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", redirect_uri);
        if (code_verifier) {
          params.append("code_verifier", code_verifier);
        }
      } else {
        return new Response(JSON.stringify({ error: "Invalid provider specified" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await tokenResponse.json();

      return new Response(JSON.stringify(data), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Token exchange internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};