export interface Env {
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  KICK_CLIENT_ID: string;
  KICK_CLIENT_SECRET: string;
  PAGES_ORIGIN: string;
  REDIRECT_URI: string;
  HANDOFFS: DurableObjectNamespace;
}

interface ExchangeRequest {
  provider: "twitch" | "kick";
  code: string;
  state: string;
  handoff_proof: string;
  code_verifier?: string;
}

interface HandoffRecord {
  accessToken: string;
  handoffProof: string;
}

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const HANDOFF_TTL_SECONDS = 300;

export class HandoffStore {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path === "/store") {
      await this.state.storage.put("record", await request.json() as HandoffRecord);
      await this.state.storage.setAlarm(Date.now() + HANDOFF_TTL_SECONDS * 1000);
      return new Response(null, { status: 204 });
    }

    if (request.method === "POST" && path === "/redeem") {
      const { handoff_secret: handoffSecret } = await request.json() as { handoff_secret?: string };
      const record = await this.state.storage.get<HandoffRecord>("record");
      if (!record || !handoffSecret || (await sha256Base64Url(handoffSecret)) !== record.handoffProof) {
        return json({ error: "Invalid or expired handoff code" }, 400);
      }
      await this.state.storage.delete("record");
      return json({ access_token: record.accessToken });
    }

    return json({ error: "Not found" }, 404);
  }

  async alarm(): Promise<void> {
    await this.state.storage.delete("record");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "OPTIONS") {
      return corsResponse(request, env, new Response(null, { status: 204 }));
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/exchange") {
      if (request.headers.get("Origin") !== env.PAGES_ORIGIN) {
        return json({ error: "Untrusted origin" }, 403);
      }
      return corsResponse(request, env, await exchange(request, env));
    }
    if (path === "/handoff") {
      if (request.headers.has("Origin")) {
        return json({ error: "Browser handoff redemption is not allowed" }, 403);
      }
      return redeem(request, env);
    }
    return json({ error: "Not found" }, 404);
  },
};

async function exchange(request: Request, env: Env): Promise<Response> {
  let body: ExchangeRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!isExchangeRequest(body) || (body.provider === "kick" && !body.code_verifier)) {
    return json({ error: "Invalid exchange request" }, 400);
  }

  const tokenResponse = await fetchToken(body, env);
  if (!tokenResponse.ok) {
    return json({ error: "Provider token exchange failed" }, 400);
  }
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) {
    return json({ error: "Provider returned no access token" }, 400);
  }

  const handoffCode = crypto.randomUUID();
  const handoffId = env.HANDOFFS.idFromName(handoffCode);
  await env.HANDOFFS.get(handoffId).fetch("https://handoff/store", {
    method: "POST",
    body: JSON.stringify({ accessToken: tokenData.access_token, handoffProof: body.handoff_proof }),
  });
  return json({ handoff_code: handoffCode });
}

async function redeem(request: Request, env: Env): Promise<Response> {
  let body: { handoff_code?: string; handoff_secret?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.handoff_code || !body.handoff_secret) {
    return json({ error: "Invalid handoff request" }, 400);
  }
  const handoffId = env.HANDOFFS.idFromName(body.handoff_code);
  return env.HANDOFFS.get(handoffId).fetch("https://handoff/redeem", {
    method: "POST",
    body: JSON.stringify({ handoff_secret: body.handoff_secret }),
  });
}

async function fetchToken(body: ExchangeRequest, env: Env): Promise<Response> {
  const isTwitch = body.provider === "twitch";
  const params = new URLSearchParams({
    client_id: isTwitch ? env.TWITCH_CLIENT_ID : env.KICK_CLIENT_ID,
    client_secret: isTwitch ? env.TWITCH_CLIENT_SECRET : env.KICK_CLIENT_SECRET,
    code: body.code,
    grant_type: "authorization_code",
    redirect_uri: env.REDIRECT_URI,
  });
  if (!isTwitch) {
    params.set("code_verifier", body.code_verifier!);
  }
  return fetch(isTwitch ? "https://id.twitch.tv/oauth2/token" : "https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
}

function isExchangeRequest(body: ExchangeRequest): boolean {
  return (body.provider === "twitch" || body.provider === "kick")
    && typeof body.code === "string" && body.code.length > 0
    && typeof body.state === "string" && body.state.length >= 32
    && typeof body.handoff_proof === "string" && body.handoff_proof.length >= 32;
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function corsResponse(request: Request, env: Env, response: Response): Response {
  if (request.headers.get("Origin") !== env.PAGES_ORIGIN) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", env.PAGES_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}